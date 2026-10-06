import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'

const port = Number(process.env.TEST_API_PORT || 4001)
const base = `http://localhost:${port}`
const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required. Run tests only against a dedicated local test database.')
const target = new URL(testDatabaseUrl)
if (target.hostname.includes('supabase') || process.env.NODE_ENV === 'production' || !target.pathname.endsWith('_test')) throw new Error('Refusing to run destructive security tests against a non-local or non-test database.')
const sql = postgres(testDatabaseUrl, { max: 1 })
const requiredColumns = ['first_name', 'display_name', 'account_status']
const columns = await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name in ${sql(requiredColumns)}`
if (columns.length !== requiredColumns.length) throw new Error('Test database is not migrated. Run pnpm db:test:setup.')
const server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: new URL('..', import.meta.url), env: { ...process.env, DATABASE_URL: testDatabaseUrl, PORT: String(port) }, stdio: 'inherit' })
const waitForServer = async () => { for (let attempt = 0; attempt < 30; attempt += 1) { try { const response = await fetch(`${base}/api/clients`); if (response.status === 401) return } catch { /* server is starting */ } await new Promise(resolve => setTimeout(resolve, 250)) } throw new Error(`Test API did not become reachable on port ${port}.`) }
const run = `security-${crypto.randomUUID().slice(0, 8)}`
const password = 'SecurityTest123!'
const cookieFor = async email => { const response = await fetch(`${base}/api/auth/sign-in`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }); if (response.status !== 200) throw new Error(`Sign in fixture failed for ${email}: ${await response.text()}`); return response.headers.get('set-cookie').split(';')[0] }
const request = (path, cookie, options = {}) => fetch(`${base}${path}`, { ...options, headers: { cookie, 'content-type': 'application/json', ...(options.headers || {}) } })
const createUser = async (name, email) => (await sql`insert into users (name, first_name, display_name, email, password_hash) values (${name}, ${name}, ${name}, ${email.toLowerCase()}, ${await bcrypt.hash(password, 10)}) returning id`)[0].id
const membership = (workspaceId, userId, role) => sql`insert into workspace_memberships (workspace_id, user_id, role, status, joined_at) values (${workspaceId}, ${userId}, ${role}::workspace_role, 'ACTIVE'::membership_status, now())`

let workspaceA, workspaceB, ids = {}
try {
  await waitForServer()
  workspaceA = (await sql`insert into workspaces (name, slug) values (${`${run} A`}, ${`${run}-a`}) returning id`)[0].id
  workspaceB = (await sql`insert into workspaces (name, slug) values (${`${run} B`}, ${`${run}-b`}) returning id`)[0].id
  for (const key of ['admin', 'manager', 'memberA', 'memberB', 'foreign']) ids[key] = await createUser(key, `${run}-${key}@example.test`)
  await membership(workspaceA, ids.admin, 'ADMIN'); await membership(workspaceA, ids.manager, 'MANAGER'); await membership(workspaceA, ids.memberA, 'MEMBER'); await membership(workspaceA, ids.memberB, 'MEMBER'); await membership(workspaceB, ids.foreign, 'OWNER')
  const clientA = (await sql`insert into clients (workspace_id, name, owner_user_id) values (${workspaceA}, ${`${run} member-a client`}, ${ids.memberA}) returning id`)[0].id
  const clientB = (await sql`insert into clients (workspace_id, name, owner_user_id) values (${workspaceB}, ${`${run} foreign client`}, ${ids.foreign}) returning id`)[0].id
  const admin = await cookieFor(`${run}-admin@example.test`), manager = await cookieFor(`${run}-manager@example.test`), memberA = await cookieFor(`${run}-memberA@example.test`), memberB = await cookieFor(`${run}-memberB@example.test`)
  assert.equal((await request('/api/clients', memberA)).status, 200)
  const aList = await (await request(`/api/clients?search=${encodeURIComponent(run)}`, memberA)).json(); assert.equal(aList.total, 1, 'member total is scoped')
  const bList = await (await request(`/api/clients?search=${encodeURIComponent(run)}`, memberB)).json(); assert.equal(bList.total, 0, 'search does not leak inaccessible client')
  assert.equal((await request(`/api/clients/${clientA}`, memberB)).status, 404, 'other member cannot fetch client')
  assert.equal((await request(`/api/clients/${clientA}`, memberB, { method: 'DELETE' })).status, 403, 'other member cannot archive')
  assert.equal((await request(`/api/clients/${clientA}`, manager)).status, 200, 'manager can fetch member client')
  assert.equal((await request(`/api/clients/${clientB}`, manager)).status, 404, 'cross-workspace client is hidden')
  const createdResponse = await request('/api/clients', admin, { method: 'POST', body: JSON.stringify({ name: `${run} lifecycle client`, ownerUserId: ids.memberA }) })
  assert.equal(createdResponse.status, 201, 'admin can create an assigned client')
  const created = await createdResponse.json()
  assert.equal(created.owner.id, ids.memberA, 'create response hydrates assigned owner')
  assert.equal((await request(`/api/clients/${created.id}`, admin, { method: 'PATCH', body: JSON.stringify({ phone: '555-0100' }) })).status, 200, 'admin can edit client')
  assert.equal((await request(`/api/clients/${created.id}`, admin, { method: 'DELETE' })).status, 204, 'admin can archive client')
  const lifecycleActions = await sql`select action from activities where entity_id = ${created.id}::uuid order by created_at`
  assert.deepEqual(lifecycleActions.map(item => item.action), ['CREATED', 'UPDATED', 'ARCHIVED'], 'client lifecycle writes auditable activity')
  assert.equal((await request('/api/clients', memberA, { method: 'POST', body: JSON.stringify({ name: `${run} forged owner`, ownerUserId: ids.foreign }) })).status, 403, 'member cannot assign foreign owner')
  await sql`update workspace_memberships set role = 'MEMBER'::workspace_role where workspace_id = ${workspaceA} and user_id = ${ids.admin}`
  assert.equal((await request('/api/clients', admin, { method: 'POST', body: JSON.stringify({ name: `${run} stale admin` }) })).status, 403, 'stale admin session uses current role')
  await sql`update workspace_memberships set status = 'SUSPENDED'::membership_status where workspace_id = ${workspaceA} and user_id = ${ids.memberA}`
  assert.equal((await request('/api/clients', memberA)).status, 403, 'suspension invalidates existing session')
  await sql`update workspace_memberships set status = 'REMOVED'::membership_status where workspace_id = ${workspaceA} and user_id = ${ids.memberB}`
  assert.equal((await request('/api/clients', memberB)).status, 403, 'removal invalidates existing session')
  console.log('PASS security integration suite')
} finally {
  server.kill()
  if (workspaceA || workspaceB) { const a = workspaceA || '00000000-0000-0000-0000-000000000000', b = workspaceB || '00000000-0000-0000-0000-000000000000'; await sql`delete from activities where workspace_id in (${a}::uuid, ${b}::uuid)`; await sql`delete from clients where workspace_id in (${a}::uuid, ${b}::uuid)`; await sql`delete from workspaces where id in (${a}::uuid, ${b}::uuid)` }
  await sql.end({ timeout: 5 })
}
