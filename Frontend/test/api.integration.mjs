import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readdir, readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import { ROLE_PERMISSIONS, ROLES } from '../lib/authorization-policy.ts'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required for API integration tests.')
const target = new URL(databaseUrl)
if (target.hostname.includes('supabase') || process.env.NODE_ENV === 'production' || !target.pathname.endsWith('_test')) throw new Error('Refusing to run API integration tests against a non-test database.')
const port = Number(process.env.NEXT_API_TEST_PORT || 3002), base = `http://127.0.0.1:${port}`, sql = postgres(databaseUrl, { max: 1 })
const [{ count: migrations }] = await sql`select count(*)::int as count from information_schema.tables where table_schema='public' and table_name in ('document_line_items','document_templates','calendar_reminders','integration_credentials')`
if (migrations !== 4) throw new Error('Test database is not migrated through 022. Run Backend pnpm db:test:setup.')
const run = `api-${crypto.randomUUID().slice(0, 8)}`, password = 'ApiIntegration123!'
let workspaceA, workspaceB, server, logs = ''
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) })).status === 200) return } catch {} await new Promise(resolve => setTimeout(resolve, 250)) } throw new Error(`API server did not start. ${logs}`) }
const createUser = async role => (await sql`insert into users(name,first_name,display_name,email,password_hash) values(${role},${role},${role},${`${run}-${role}@example.test`},${await bcrypt.hash(password, 10)}) returning id`)[0].id
const signIn = async role => { const response = await fetch(`${base}/api/auth/sign-in`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${run}-${role}@example.test`, password }) }); assert.equal(response.status, 200, `${role} signs in`); return response.headers.get('set-cookie').split(';')[0] }
const request = (path, cookie, options = {}) => fetch(`${base}${path}`, { ...options, cache: 'no-store', headers: { cookie, 'content-type': 'application/json', ...(options.headers || {}) } })
const body = async response => ({ response, json: await response.json() })
const activityCount = async (type, id) => Number((await sql`select count(*)::int as count from activities where entity_type=${type} and entity_id=${id}::uuid`)[0].count)
const activityActions = async (type, id) => (await sql`select action::text from activities where entity_type=${type} and entity_id=${id}::uuid order by created_at` ).map(row => row.action)
const apiRoot = fileURLToPath(new URL('../app/api', import.meta.url))
const publicRoutes = new Set(['/api/health'])
const publicRoute = route => publicRoutes.has(route) || route.startsWith('/api/auth/') || route.startsWith('/api/invitations/')
const inventory = async directory => { const entries = await readdir(directory, { withFileTypes: true }); const found = []; for (const entry of entries) { const path = `${directory}/${entry.name}`; if (entry.isDirectory()) found.push(...await inventory(path)); else if (entry.name === 'route.ts') found.push(path) } return found }
const routePath = file => `/api${file.slice(apiRoot.length, -'route.ts'.length).replaceAll('\\', '/').replace(/\/\[([^/]+)\]/g, '/00000000-0000-0000-0000-000000000000').replace(/\/$/, '')}`
const verifyRouteInventory = async () => { for (const file of await inventory(apiRoot)) { const route = routePath(file), source = await readFile(file, 'utf8'), methods = [...source.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\b/g)].map(match => match[1]); assert.ok(methods.length, `${route} has an exported HTTP method`); assert.ok(publicRoute(route) || route.startsWith('/api/'), `${route} is classified`); if (publicRoute(route)) continue; for (const method of methods) { const response = await request(route, 'anonymous=1', { method, redirect: 'manual', body: method === 'GET' || method === 'DELETE' ? undefined : '{}' }); assert.equal(response.status, 401, `${method} ${route} rejects anonymous callers`) } } }
try {
  const permissionSnapshot = {
    OWNER: ['clients.view', 'clients.create', 'clients.edit', 'clients.archive', 'clients.assign', 'clients.view_all', 'projects.view', 'projects.create', 'projects.edit', 'projects.archive', 'projects.assign', 'projects.view_all', 'requirements.view', 'requirements.create', 'requirements.edit', 'requirements.archive', 'requirements.assign', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.complete', 'tasks.assign', 'tasks.archive', 'tasks.view_all', 'activity.view', 'drive.view', 'drive.upload', 'drive.create_folder', 'drive.rename', 'drive.move', 'drive.delete', 'drive.manage', 'meetings.view', 'meetings.create', 'meetings.edit', 'meetings.cancel', 'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.export', 'approvals.view', 'approvals.request', 'approvals.approve', 'approvals.reject', 'team.view', 'team.invite', 'team.edit_role', 'team.suspend', 'team.remove', 'settings.view', 'settings.edit', 'settings.security', 'settings.integrations'],
    ADMIN: ['clients.view', 'clients.create', 'clients.edit', 'clients.archive', 'clients.assign', 'clients.view_all', 'projects.view', 'projects.create', 'projects.edit', 'projects.archive', 'projects.assign', 'projects.view_all', 'requirements.view', 'requirements.create', 'requirements.edit', 'requirements.archive', 'requirements.assign', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.complete', 'tasks.assign', 'tasks.archive', 'tasks.view_all', 'activity.view', 'drive.view', 'drive.upload', 'drive.create_folder', 'drive.rename', 'drive.move', 'drive.delete', 'drive.manage', 'meetings.view', 'meetings.create', 'meetings.edit', 'meetings.cancel', 'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.export', 'approvals.view', 'approvals.request', 'approvals.approve', 'approvals.reject', 'team.view', 'team.invite', 'team.edit_role', 'team.suspend', 'team.remove', 'settings.view', 'settings.edit'],
    MANAGER: ['clients.view', 'clients.create', 'clients.edit', 'clients.assign', 'clients.view_all', 'projects.view', 'projects.create', 'projects.edit', 'projects.assign', 'projects.view_all', 'requirements.view', 'requirements.create', 'requirements.edit', 'requirements.assign', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.complete', 'tasks.assign', 'tasks.view_all', 'activity.view', 'drive.view', 'drive.upload', 'drive.create_folder', 'drive.rename', 'meetings.view', 'meetings.create', 'meetings.edit', 'documents.view', 'documents.create', 'documents.edit', 'finance.view', 'approvals.view', 'approvals.request', 'settings.view'],
    MEMBER: ['clients.view', 'projects.view', 'requirements.view', 'requirements.create', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.complete', 'activity.view', 'drive.view', 'drive.upload', 'meetings.view', 'meetings.create', 'documents.view', 'finance.view', 'approvals.view', 'approvals.request', 'settings.view'],
  }
  assert.deepEqual(ROLE_PERMISSIONS, permissionSnapshot, 'RBAC matrix snapshot matches the approved policy')
  for (let index = 0; index < ROLES.length - 1; index += 1) for (const permission of ROLE_PERMISSIONS[ROLES[index + 1]]) assert.ok(ROLE_PERMISSIONS[ROLES[index]].includes(permission), `${ROLES[index]} is a permission superset of ${ROLES[index + 1]}`)
  server = spawn('pnpm.cmd', ['start', '-p', String(port), '-H', '127.0.0.1'], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], shell: true })
  server.stdout.on('data', chunk => { logs += chunk })
  server.stderr.on('data', chunk => { logs += chunk })
  await waitForServer()
  await verifyRouteInventory()
  workspaceA = (await sql`insert into workspaces(name,slug) values(${`${run} A`},${`${run}-a`}) returning id`)[0].id
  workspaceB = (await sql`insert into workspaces(name,slug) values(${`${run} B`},${`${run}-b`}) returning id`)[0].id
  const ids = {}; for (const role of ['owner', 'manager', 'member', 'foreign']) ids[role] = await createUser(role)
  for (const [role, dbRole] of [['owner', 'OWNER'], ['manager', 'MANAGER'], ['member', 'MEMBER']]) await sql`insert into workspace_memberships(workspace_id,user_id,role,status,joined_at) values(${workspaceA},${ids[role]},${dbRole}::workspace_role,'ACTIVE'::membership_status,now())`
  await sql`insert into workspace_memberships(workspace_id,user_id,role,status,joined_at) values(${workspaceB},${ids.foreign},'OWNER'::workspace_role,'ACTIVE'::membership_status,now())`
  for (const path of ['/api/projects', '/api/requirements', '/api/tasks', '/api/documents', '/api/document-templates', '/api/finance']) assert.equal((await request(path, 'anonymous=1')).status, 401, `${path} rejects anonymous callers`)
  const cookies = {}; for (const role of Object.keys(ids)) cookies[role] = await signIn(role)
  const ownedClient = (await sql`insert into clients(workspace_id,name,owner_user_id) values(${workspaceA},${`${run} owned`},${ids.member}) returning id`)[0].id
  const otherClient = (await sql`insert into clients(workspace_id,name,owner_user_id) values(${workspaceA},${`${run} other`},${ids.owner}) returning id`)[0].id
  const foreignClient = (await sql`insert into clients(workspace_id,name,owner_user_id) values(${workspaceB},${`${run} foreign`},${ids.foreign}) returning id`)[0].id
  const projectPayload = { name: 'Alpha project', clientId: ownedClient, projectType: 'Website', startDate: '2026-01-01', targetEndDate: '2026-02-01', ownerUserId: ids.member }
  assert.equal((await request('/api/projects', cookies.manager, { method: 'POST', body: JSON.stringify({ ...projectPayload, name: '' }) })).status, 400, 'project title validation is field-specific')
  const projectKey = crypto.randomUUID()
  const firstProject = await body(await request('/api/projects', cookies.manager, { method: 'POST', headers: { 'Idempotency-Key': projectKey }, body: JSON.stringify(projectPayload) }))
  assert.equal(firstProject.response.status, 201, 'member creates a project for an owned client')
  const projectId = firstProject.json.item.id
  const replay = await body(await request('/api/projects', cookies.manager, { method: 'POST', headers: { 'Idempotency-Key': projectKey }, body: JSON.stringify(projectPayload) }))
  assert.equal(replay.response.status, 201); assert.equal(replay.json.item.id, projectId, 'idempotency replay returns the created project')
  assert.equal(await activityCount('project', projectId), 1, 'replay writes no duplicate project activity')
  const [{ count: seeded }] = await sql`select count(*)::int as count from requirements where project_id=${projectId}::uuid`; assert.equal(seeded, firstProject.json.item.seededRequirementCount, 'template requirements are seeded once')
  assert.match(firstProject.json.item.project_code, /^PROJ-/, 'project code is generated by the server')
  assert.equal((await request(`/api/projects/${projectId}`, cookies.member)).status, 200, 'member reads owned project')
  assert.equal((await request('/api/projects?search=Alpha', cookies.member)).status, 200, 'project search is available')
  const hiddenProject = (await sql`insert into projects(workspace_id,client_id,name,project_type,start_date,target_end_date,owner_user_id) values(${workspaceA},${otherClient},'Hidden project','Website','2026-01-01','2026-02-01',${ids.owner}) returning id`)[0].id
  assert.equal((await request(`/api/projects/${hiddenProject}`, cookies.member)).status, 404, 'member cannot read another client project')
  const foreignProject = (await sql`insert into projects(workspace_id,client_id,name,project_type,start_date,target_end_date,owner_user_id) values(${workspaceB},${foreignClient},'Foreign project','Website','2026-01-01','2026-02-01',${ids.foreign}) returning id`)[0].id
  assert.equal((await request(`/api/projects/${foreignProject}`, cookies.owner)).status, 404, 'cross-workspace project IDs are hidden')
  const financePayload = { clientId: ownedClient, projectId, title: 'Alpha receivable', recordType: 'RECEIVABLE', status: 'PENDING', dueAt: '2026-02-04T10:00:00.000Z', amount: 1250.5, currency: 'INR' }
  assert.equal((await request('/api/finance', 'anonymous=1', { method: 'POST', body: JSON.stringify(financePayload) })).status, 401, 'finance creation rejects anonymous callers')
  assert.equal((await request('/api/finance', cookies.member, { method: 'POST', body: JSON.stringify({ ...financePayload, amount: 'not-a-number' }) })).status, 403, 'finance permission denial precedes validation for a user without finance.create')
  for (const payload of [{ ...financePayload, amount: -1 }, { ...financePayload, amount: 'not-a-number' }, { ...financePayload, currency: 'RUPEES' }, { ...financePayload, dueAt: 'not-a-date' }, { ...financePayload, recordType: 'NOPE' }, { ...financePayload, status: 'NOPE' }]) assert.equal((await request('/api/finance', cookies.owner, { method: 'POST', body: JSON.stringify(payload) })).status, 400, 'finance rejects invalid input')
  assert.equal((await request('/api/finance', cookies.owner, { method: 'POST', body: JSON.stringify({ ...financePayload, projectId: hiddenProject }) })).status, 400, 'finance rejects a project from another client')
  const finance = await body(await request('/api/finance', cookies.owner, { method: 'POST', body: JSON.stringify(financePayload) })); assert.equal(finance.response.status, 201, 'owner creates finance record'); const financeId = finance.json.item.id
  assert.equal(await activityCount('finance', financeId), 1, 'finance creation writes activity')
  assert.equal((await request(`/api/finance/${financeId}`, cookies.member)).status, 200, 'member reads finance record for owned client')
  const memberFinance = await body(await request('/api/finance', cookies.member)); assert.equal(memberFinance.response.status, 200); assert.equal(memberFinance.json.items.some(item => item.id === financeId), true, 'member list includes owned-client finance')
  assert.equal(memberFinance.json.items.every(item => item.client_id !== null), true, 'member finance list excludes records without a client')
  const managerFinance = await body(await request('/api/finance', cookies.manager)); assert.equal(managerFinance.response.status, 200, 'manager reads Finance workspace-wide'); assert.equal(managerFinance.json.items.some(item => item.id === financeId), true, 'manager sees Finance records outside Member client ownership')
  const financeTypes = await Promise.all(['PAYMENT', 'EXPENSE'].map(async recordType => body(await request('/api/finance', cookies.owner, { method: 'POST', body: JSON.stringify({ ...financePayload, title: `Alpha ${recordType.toLowerCase()}`, recordType }) }))))
  for (const result of financeTypes) assert.equal(result.response.status, 201, 'owner creates each Finance type')
  for (const recordType of ['RECEIVABLE', 'PAYMENT', 'EXPENSE']) { const filtered = await body(await request(`/api/finance?type=${recordType}`, cookies.owner)); assert.equal(filtered.response.status, 200); assert.equal(filtered.json.items.every(item => item.record_type === recordType), true, `${recordType} filter returns only its type`); assert.ok(filtered.json.items.length >= 1, `${recordType} filter returns the created record`) }
  const foreignFinance = (await sql`insert into finance_records(workspace_id,client_id,title,record_type,status,amount,currency) values(${workspaceB},${foreignClient},'Foreign finance','RECEIVABLE','PENDING',100,'USD') returning id`)[0].id
  assert.equal((await request(`/api/finance/${foreignFinance}`, cookies.owner)).status, 404, 'cross-workspace finance is hidden')
  const financeUpdate = await body(await request(`/api/finance/${financeId}`, cookies.owner, { method: 'PATCH', body: JSON.stringify({ amount: 1999.75, currency: 'USD', paidAt: '2026-02-05T10:00:00.000Z' }) })); assert.equal(financeUpdate.response.status, 200, 'finance record updates'); assert.deepEqual({ amount: Number(financeUpdate.json.item.amount), currency: financeUpdate.json.item.currency, paidAt: financeUpdate.json.item.paid_at }, { amount: 1999.75, currency: 'USD', paidAt: '2026-02-05T10:00:00.000Z' }, 'finance amount, currency, and paid date persist')
  assert.equal((await request(`/api/finance/${financeId}`, cookies.owner, { method: 'PATCH', body: JSON.stringify({ projectId: hiddenProject }) })).status, 400, 'finance update rejects a project from another client')
  assert.equal((await request(`/api/finance/${financeId}`, cookies.member, { method: 'PATCH', body: JSON.stringify({ amount: 'not-a-number' }) })).status, 403, 'finance edit denial precedes validation for a user without finance.edit')
  assert.equal((await request(`/api/finance/${financeId}`, cookies.owner, { method: 'DELETE' })).status, 200, 'finance record archives')
  assert.equal(await activityCount('finance', financeId), 3, 'finance lifecycle writes create, update, and archive activities')
  assert.deepEqual(await activityActions('finance', financeId), ['CREATED', 'UPDATED', 'ARCHIVED'], 'Finance archive writes an ARCHIVED activity row')
  assert.equal((await request(`/api/finance/${financeId}`, cookies.owner)).status, 404, 'archived finance record is hidden')
  const requirementPayload = { clientId: ownedClient, projectId, title: 'Alpha requirement', dueAt: '2026-02-02T10:00:00.000Z' }
  assert.equal((await request('/api/requirements', cookies.manager, { method: 'POST', body: JSON.stringify({ ...requirementPayload, status: 'NOPE' }) })).status, 400, 'requirement enum validation')
  assert.equal((await request('/api/requirements', cookies.manager, { method: 'POST', body: JSON.stringify({ ...requirementPayload, projectId: hiddenProject }) })).status, 400, 'requirement rejects a project from another client')
  const requirement = await body(await request('/api/requirements', cookies.manager, { method: 'POST', body: JSON.stringify(requirementPayload) })); assert.equal(requirement.response.status, 201); assert.match(requirement.json.item.requirement_code, /^REQ-/, 'requirement code is server generated')
  const requirementId = requirement.json.item.id; assert.equal(await activityCount('requirement', requirementId), 1)
  assert.equal((await request(`/api/requirements/${requirementId}`, cookies.manager, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) })).status, 200)
  assert.equal(await activityCount('requirement', requirementId), 1, 'recent requirement update consolidates activity')
  assert.equal((await request(`/api/requirements/${requirementId}`, cookies.foreign)).status, 404, 'foreign workspace cannot read requirement')
  const taskPayload = { clientId: ownedClient, projectId, title: 'Alpha task', dueAt: '2026-02-03T10:00:00.000Z' }
  assert.equal((await request('/api/tasks', cookies.manager, { method: 'POST', body: JSON.stringify({ ...taskPayload, projectId: hiddenProject }) })).status, 400, 'task rejects a project from another client')
  const task = await body(await request('/api/tasks', cookies.manager, { method: 'POST', body: JSON.stringify(taskPayload) })); assert.equal(task.response.status, 201); const taskId = task.json.item.id
  const taskUpdate = await body(await request(`/api/tasks/${taskId}`, cookies.manager, { method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS', dueAt: null }) })); assert.equal(taskUpdate.response.status, 200); assert.equal(taskUpdate.json.item.status, 'IN_PROGRESS'); assert.equal(taskUpdate.json.item.due_at, null); assert.equal(await activityCount('task', taskId), 2)
  assert.equal((await request(`/api/tasks/${taskId}`, cookies.foreign, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) })).status, 404, 'foreign workspace cannot mutate task')
  const document = await body(await request('/api/documents', cookies.manager, { method: 'POST', body: JSON.stringify({ clientId: ownedClient, projectId, title: 'Alpha quote', documentType: 'QUOTATION' }) })); assert.equal(document.response.status, 201); const documentId = document.json.item.id
  assert.equal((await request('/api/documents?type=INVOICE', cookies.member)).status, 200, 'document type filtering is available')
  const calculated = await body(await request(`/api/documents/${documentId}`, cookies.manager, { method: 'PATCH', body: JSON.stringify({ lineItems: [{ description: 'Design', quantity: 2.5, unitPrice: 19.99, discountAmount: 3.33, taxRate: 18 }] }) })); assert.equal(calculated.response.status, 200); assert.deepEqual({ subtotal: Number(calculated.json.item.subtotal), discount: Number(calculated.json.item.discount_amount), tax: Number(calculated.json.item.tax_amount), total: Number(calculated.json.item.total_amount) }, { subtotal: 49.98, discount: 3.33, tax: 8.4, total: 55.05 }, 'document totals are server-calculated and rounded')
  for (const status of ['SENT', 'APPROVED', 'SIGNED']) assert.equal((await request(`/api/documents/${documentId}`, cookies.manager, { method: 'PATCH', body: JSON.stringify({ status }) })).status, 200, `document transitions to ${status}`)
  assert.equal((await request(`/api/documents/${documentId}`, cookies.member, { method: 'PATCH', body: JSON.stringify({ lineItems: [{ description: 'No', quantity: 1, unitPrice: 1 }] }) })).status, 403, 'permission denial precedes line-item validation')
  const [timestamps] = await sql`select sent_at,approved_at,signed_at from documents where id=${documentId}::uuid`; assert.ok(timestamps.sent_at && timestamps.approved_at && timestamps.signed_at, 'workflow timestamps persist')
  assert.equal((await request(`/api/documents/${documentId}`, cookies.member, { method: 'PATCH', body: JSON.stringify({ status: 'VOID' }) })).status, 403, 'permission denial precedes workflow validation')
  assert.equal((await request(`/api/documents/${documentId}`, cookies.foreign)).status, 404, 'foreign workspace document is hidden')
  const templateOne = await body(await request('/api/document-templates', cookies.owner, { method: 'POST', body: JSON.stringify({ documentType: 'INVOICE', name: 'First', isDefault: true, body: { title: 'Invoice' } }) })); assert.equal(templateOne.response.status, 201); assert.equal(templateOne.json.item.version, 1)
  await body(await request('/api/document-templates', cookies.owner, { method: 'POST', body: JSON.stringify({ documentType: 'INVOICE', name: 'Second', isDefault: true }) }))
  const [{ count: defaults }] = await sql`select count(*)::int as count from document_templates where workspace_id=${workspaceA} and document_type='INVOICE' and is_default=true`; assert.equal(defaults, 1, 'one default template per document type')
  await sql`update workspace_memberships set role='MEMBER'::workspace_role where workspace_id=${workspaceA} and user_id=${ids.manager}`
  assert.equal((await request('/api/documents', cookies.manager, { method: 'POST', body: JSON.stringify({ clientId: otherClient, title: 'stale role', documentType: 'INVOICE' }) })).status, 403, 'stale manager session uses current role')
  await sql`update workspace_memberships set status='SUSPENDED'::membership_status where workspace_id=${workspaceA} and user_id=${ids.member}`
  assert.equal((await request('/api/tasks', cookies.member)).status, 403, 'suspended member session is denied')
  console.log('PASS API integration suite')
} finally {
  server?.kill()
  if (workspaceA || workspaceB) { const a = workspaceA || '00000000-0000-0000-0000-000000000000', b = workspaceB || '00000000-0000-0000-0000-000000000000'; await sql`delete from activities where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from finance_records where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from documents where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from requirements where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from tasks where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from projects where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from clients where workspace_id in (${a}::uuid,${b}::uuid)`; await sql`delete from workspaces where id in (${a}::uuid,${b}::uuid)` }
  await sql.end({ timeout: 5 })
}
