import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'
import navigation from '../lib/navigation.json' with { type: 'json' }

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required for Next security tests.')
const target = new URL(databaseUrl)
if (target.hostname.includes('supabase') || process.env.NODE_ENV === 'production' || !target.pathname.endsWith('_test')) throw new Error('Refusing to run Next security tests against a non-local test database.')
const port = Number(process.env.NEXT_TEST_PORT || 3003), base = `http://127.0.0.1:${port}`, sql = postgres(databaseUrl, { max: 1 })
const required = await sql`select count(*)::int as count from information_schema.columns where table_schema='public' and table_name='workspace_memberships' and column_name in ('id','status','joined_at')`
if (required[0].count !== 3) throw new Error('Test database is not migrated. Run Backend pnpm db:test:setup.')
const password = 'SecurityTest123!', run = `next-security-${crypto.randomUUID().slice(0, 8)}`
const navigationRoutes = navigation.flatMap(item => [
  item.id === 'dashboard' ? '/dashboard' : `/${item.id}`,
  ...(item.children || []).map(child => `/${item.id}/${child}`),
])
let runtimeLogs = ''
const server = spawn('pnpm.cmd', ['start', '-p', String(port), '-H', '127.0.0.1'], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], shell: true })
server.stdout.on('data', chunk => { runtimeLogs += chunk.toString() })
server.stderr.on('data', chunk => { runtimeLogs += chunk.toString() })
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) }); if (response.status === 200) return } catch {} await new Promise(resolve => setTimeout(resolve, 250)) } throw new Error(`Next test server did not become reachable on ${base}. Logs:\n${runtimeLogs}`) }
const createUser = async (name, email) => (await sql`insert into users (name,first_name,display_name,email,password_hash) values (${name},${name},${name},${email.toLowerCase()},${await bcrypt.hash(password, 10)}) returning id`)[0].id
const cookieFor = async email => { const response = await fetch(`${base}/api/auth/sign-in`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ email, password }) }); assert.equal(response.status, 200, `sign in ${email}`); const setCookie = response.headers.get('set-cookie'); assert.match(setCookie || '', /^qnl_session=/, 'sign in sets the expected session cookie'); assert.match(setCookie || '', /; Path=\//, 'session cookie has a root path'); assert.match(setCookie || '', /; HttpOnly/, 'session cookie is HttpOnly'); assert.match(setCookie || '', /; SameSite=lax/i, 'session cookie is SameSite=Lax'); return setCookie.split(';')[0] }
const request = (path, cookie, options={}) => fetch(`${base}${path}`, { ...options, headers:{ cookie, 'content-type':'application/json', ...(options.headers || {}) } })
let workspaceA, workspaceB, signupWorkspace, users = {}, memberships = {}
try {
  await waitForServer()
  const signupEmail = `${run}-signup@example.test`
  const signupResponse = await fetch(`${base}/api/auth/sign-up`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Signup Owner', email: signupEmail, password }) })
  assert.equal(signupResponse.status, 201, 'new user sign-up creates a workspace')
  const signup = await signupResponse.json(); signupWorkspace = signup.workspaceId
  const [subscription] = await sql`select plan_code,status,seat_limit from workspace_subscriptions where workspace_id=${signupWorkspace}::uuid`
  assert.deepEqual({ plan_code: subscription.plan_code, status: subscription.status, seat_limit: subscription.seat_limit }, { plan_code: 'FREE', status: 'TRIALING', seat_limit: 5 }, 'sign-up provisions the default trial subscription')
  const [{ count: integrationCount }] = await sql`select count(*)::int as count from integration_connections where workspace_id=${signupWorkspace}::uuid and status='NOT_CONFIGURED'::integration_status`
  assert.equal(integrationCount, 7, 'sign-up provisions every disconnected workspace integration')
  workspaceA = (await sql`insert into workspaces (name,slug) values (${`${run} A`},${`${run}-a`}) returning id`)[0].id
  workspaceB = (await sql`insert into workspaces (name,slug) values (${`${run} B`},${`${run}-b`}) returning id`)[0].id
  for (const role of ['owner','admin','manager','memberA','memberB','foreign']) users[role] = await createUser(role, `${run}-${role}@example.test`)
  for (const [role, value] of Object.entries({ owner:'OWNER', admin:'ADMIN', manager:'MANAGER', memberA:'MEMBER', memberB:'MEMBER' })) memberships[role] = (await sql`insert into workspace_memberships (workspace_id,user_id,role,status,joined_at) values (${workspaceA},${users[role]},${value}::workspace_role,'ACTIVE'::membership_status,now()) returning id`)[0].id
  memberships.foreign = (await sql`insert into workspace_memberships (workspace_id,user_id,role,status,joined_at) values (${workspaceB},${users.foreign},'OWNER'::workspace_role,'ACTIVE'::membership_status,now()) returning id`)[0].id
  const cookies = {}; for (const role of Object.keys(users)) cookies[role] = await cookieFor(`${run}-${role}@example.test`)
  for (const route of navigationRoutes) {
    const response = await request(route, cookies.owner, { redirect: 'manual' })
    assert.notEqual(response.status, 404, `sidebar route ${route} renders instead of returning 404`)
    assert.equal(response.status, 200, `sidebar route ${route} renders for an authorized owner`)
  }
  const currentAccess = await request('/api/me', cookies.owner); assert.equal(currentAccess.status, 200, 'newly issued same-origin session loads current access'); const currentAccessBody = await currentAccess.json(); assert.equal(currentAccessBody.user.id, users.owner); assert.equal(currentAccessBody.membership.role, 'OWNER')
  assert.equal((await request('/api/team', cookies.owner)).status, 200, 'owner may list team')
  assert.equal((await request('/api/team', cookies.admin)).status, 200, 'admin may list team')
  assert.equal((await request('/api/team', cookies.memberA)).status, 403, 'member cannot list team')
  assert.equal((await request(`/api/team/${memberships.memberA}`, cookies.owner, { method:'PATCH', body:JSON.stringify({ role:'MANAGER' }) })).status, 200, 'owner may change role')
  assert.equal((await request(`/api/team/${memberships.memberA}`, cookies.memberA, { method:'PATCH', body:JSON.stringify({ role:'OWNER' }) })).status, 400, 'member cannot self-promote')
  assert.equal((await request(`/api/team/${memberships.admin}`, cookies.admin, { method:'PATCH', body:JSON.stringify({ role:'OWNER' }) })).status, 400, 'admin cannot become owner')
  assert.equal((await request(`/api/team/${memberships.foreign}`, cookies.owner, { method:'PATCH', body:JSON.stringify({ role:'MEMBER' }) })).status, 404, 'foreign membership is hidden')
  assert.equal((await request(`/api/team/${memberships.owner}`, cookies.owner, { method:'PATCH', body:JSON.stringify({ status:'SUSPENDED' }) })).status, 403, 'sole owner cannot be suspended')
  assert.equal((await request('/api/account', cookies.owner, { method:'PATCH', body:JSON.stringify({ firstName:'Owner', lastName:'Updated', displayName:'Owner Updated', email:`${run}-owner@example.test`, role:'OWNER', permissions:['team.edit_role'], workspaceId:workspaceB }) })).status, 200, 'profile update accepts only profile data')
  const [profileMembership] = await sql`select role, workspace_id from workspace_memberships where id=${memberships.owner}`; assert.equal(profileMembership.role, 'OWNER'); assert.equal(profileMembership.workspace_id, workspaceA)
  assert.equal((await request('/api/account/password', cookies.owner, { method:'PATCH', body:JSON.stringify({ currentPassword:'wrong-password', newPassword:'ChangedPassword123!', confirmPassword:'ChangedPassword123!' }) })).status, 401, 'wrong password denied')
  assert.equal((await request('/api/account/password', cookies.owner, { method:'PATCH', body:JSON.stringify({ currentPassword:password, newPassword:'ChangedPassword123!', confirmPassword:'ChangedPassword123!', role:'ADMIN' }) })).status, 200, 'correct password changes')
  assert.equal((await fetch(`${base}/api/auth/sign-in`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:`${run}-owner@example.test`,password}) })).status, 401, 'old password denied')
  assert.equal((await fetch(`${base}/api/auth/sign-in`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:`${run}-owner@example.test`,password:'ChangedPassword123!'}) })).status, 200, 'new password accepted')
  await sql`update workspace_memberships set status='SUSPENDED'::membership_status where id=${memberships.memberB}`
  assert.equal((await request('/api/me', cookies.memberB)).status, 403, 'suspension invalidates existing session')
  const token = randomBytes(32).toString('base64url'), tokenHash = createHash('sha256').update(token).digest('hex'), invitedEmail = `${run}-invite@example.test`
  await sql`insert into workspace_invitations (workspace_id,email,role,token_hash,invited_by_user_id,expires_at) values (${workspaceA},${invitedEmail},'MEMBER'::workspace_role,${tokenHash},${users.owner},now()+interval '1 day')`
  const accepted = await request('/api/invitations/accept', '', { method:'POST', body:JSON.stringify({ token, name:'Invited User', password:'InvitationPassword123!', role:'OWNER', workspaceId:workspaceB }) })
  assert.equal(accepted.status, 200, 'valid invitation accepts with persisted role and workspace')
  const [inviteMembership] = await sql`select m.role,m.workspace_id from workspace_memberships m join users u on u.id=m.user_id where u.email=${invitedEmail}`; assert.equal(inviteMembership.role, 'MEMBER'); assert.equal(inviteMembership.workspace_id, workspaceA)
  assert.equal((await request('/api/invitations/accept', '', { method:'POST', body:JSON.stringify({ token, name:'Again User', password:'InvitationPassword123!' }) })).status, 404, 'invitation replay denied')
  const invitation = async (email, options = {}) => { const value = randomBytes(32).toString('base64url'), hash = createHash('sha256').update(value).digest('hex'); await sql`insert into workspace_invitations (workspace_id,email,role,token_hash,invited_by_user_id,expires_at,revoked_at,accepted_at) values (${workspaceA},${email},'MEMBER'::workspace_role,${hash},${users.owner},${options.expired ? sql`now()-interval '1 day'` : sql`now()+interval '1 day'`},${options.revoked ? sql`now()` : null},${options.consumed ? sql`now()` : null})`; return value }
  const expiredToken = await invitation(`${run}-expired@example.test`, { expired:true })
  assert.ok((await request('/api/invitations/accept', '', { method:'POST', body:JSON.stringify({ token:expiredToken, name:'Expired User', password:'InvitationPassword123!' }) })).status >= 400, 'expired invitation denied')
  const revokedToken = await invitation(`${run}-revoked@example.test`, { revoked:true })
  assert.ok((await request('/api/invitations/accept', '', { method:'POST', body:JSON.stringify({ token:revokedToken, name:'Revoked User', password:'InvitationPassword123!' }) })).status >= 400, 'revoked invitation denied')
  assert.ok((await request('/api/invitations/accept', '', { method:'POST', body:JSON.stringify({ token:'bad', name:'Malformed User', password:'InvitationPassword123!' }) })).status >= 400, 'malformed token denied')
  const tampered = await invitation(`${run}-tampered@example.test`)
  assert.ok((await request('/api/invitations/accept', '', { method:'POST', body:JSON.stringify({ token:`${tampered}x`, name:'Tampered User', password:'InvitationPassword123!' }) })).status >= 400, 'tampered token denied')
  const existingEmail = `${run}-existing@example.test`, existingId = await createUser('existing', existingEmail); await sql`insert into workspace_memberships (workspace_id,user_id,role,status,joined_at) values (${workspaceB},${existingId},'MEMBER'::workspace_role,'ACTIVE'::membership_status,now())`; const existingCookie = await cookieFor(existingEmail), existingToken = await invitation(existingEmail)
  assert.equal((await request('/api/invitations/accept', existingCookie, { method:'POST', body:JSON.stringify({ token:existingToken, role:'OWNER', workspaceId:workspaceB }) })).status, 200, 'existing user invitation accepted')
  const [existingMembership] = await sql`select m.user_id,m.workspace_id,m.role,m.status from workspace_memberships m where m.workspace_id=${workspaceA} and m.user_id=${existingId}`; assert.equal(existingMembership.user_id, existingId); assert.equal(existingMembership.workspace_id, workspaceA); assert.equal(existingMembership.role, 'MEMBER'); assert.equal(existingMembership.status, 'ACTIVE')
  const [{ count: existingUsers }] = await sql`select count(*)::int as count from users where email=${existingEmail}`; const [{ count: existingMemberships }] = await sql`select count(*)::int as count from workspace_memberships where workspace_id=${workspaceA} and user_id=${existingId}`; assert.equal(existingUsers, 1); assert.equal(existingMemberships, 1)
  const adminSession = cookies.admin
  assert.equal((await request('/api/team', adminSession)).status, 200, 'admin session initially authorized')
  await sql`update workspace_memberships set role='MEMBER'::workspace_role where id=${memberships.admin}`
  assert.equal((await request('/api/team', adminSession)).status, 403, 'stale admin session uses current database role')
  const client = (await sql`insert into clients (workspace_id,name,owner_user_id) values (${workspaceA},${`${run} removal client`},${users.memberA}) returning id`)[0].id
  await sql`update workspace_memberships set role='MEMBER'::workspace_role,status='ACTIVE'::membership_status where id=${memberships.memberA}`
  await sql`update workspace_memberships set status='ACTIVE'::membership_status where id=${memberships.memberB}`
  assert.equal((await request(`/api/team/${memberships.memberA}`, cookies.owner, { method:'PATCH', body:JSON.stringify({ status:'REMOVED' }) })).status, 409, 'removal without replacement is denied')
  assert.equal((await request(`/api/team/${memberships.memberA}`, cookies.owner, { method:'PATCH', body:JSON.stringify({ status:'REMOVED', reassignClientOwnerUserId:users.memberB }) })).status, 200, 'removal with active replacement succeeds')
  const [removed] = await sql`select status from workspace_memberships where id=${memberships.memberA}`; const [moved] = await sql`select owner_user_id from clients where id=${client}`; assert.equal(removed.status, 'REMOVED'); assert.equal(moved.owner_user_id, users.memberB)
  assert.equal((await request('/api/me', cookies.memberA)).status, 403, 'removal invalidates existing session')
  assert.equal((await request('/dashboard', cookies.owner, { redirect:'manual' })).status, 200, 'a valid session may load the protected dashboard')
  assert.equal((await request('/api/auth/sign-out', cookies.owner, { method:'POST' })).status, 204, 'sign out clears the Next session')
  const protectedAfterSignOut = await fetch(`${base}/dashboard`, { redirect:'manual' }); assert.equal(protectedAfterSignOut.status, 307, 'protected dashboard redirects after sign out'); assert.equal(protectedAfterSignOut.headers.get('location'), '/sign-in')
  console.log('PASS Next security integration suite')
} finally {
  server.kill()
  if (signupWorkspace) await sql`delete from workspaces where id=${signupWorkspace}::uuid`
  if (workspaceA || workspaceB) { const a=workspaceA || '00000000-0000-0000-0000-000000000000', b=workspaceB || '00000000-0000-0000-0000-000000000000'; await sql`delete from activities where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from workspace_invitations where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from clients where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from workspaces where id in (${a}::uuid,${b}::uuid)` }
  await sql.end({ timeout:5 })
}
