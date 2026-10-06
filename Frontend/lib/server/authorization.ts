import { db } from './db'
import { AppError } from './errors'
import { getSession } from './session'
export { ROLES, PERMISSIONS, ROLE_PERMISSIONS, type Permission, type Role } from '../authorization-policy'
import { ROLE_PERMISSIONS, type Permission, type Role } from '../authorization-policy'

export type AuthorizationContext = { userId: string; workspaceId: string; membershipId: string; role: Role; permissions: readonly Permission[] }
type MembershipRow = { id: string; role: Role; status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED'; account_status: 'ACTIVE' | 'DISABLED' }

/** Always resolves membership from the database; JWT role claims are identity hints only. */
export async function requireAuthorization(): Promise<AuthorizationContext> {
  const session = await getSession()
  if (!session) throw new AppError('UNAUTHORIZED', 'Sign in is required.', 401)
  const [membership] = await db()<MembershipRow[]>`select m.id, m.role, m.status, u.account_status from workspace_memberships m join users u on u.id = m.user_id where m.workspace_id = ${session.workspaceId} and m.user_id = ${session.userId}`
  if (!membership || membership.account_status !== 'ACTIVE' || membership.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 'Your workspace membership is not active.', 403)
  return { userId: session.userId, workspaceId: session.workspaceId, membershipId: membership.id, role: membership.role, permissions: ROLE_PERMISSIONS[membership.role] }
}

export async function requirePermission(permission: Permission) {
  const context = await requireAuthorization()
  if (!context.permissions.includes(permission)) throw new AppError('FORBIDDEN', 'You do not have permission for this action.', 403)
  return context
}

export function hasPermission(context: Pick<AuthorizationContext, 'permissions'>, permission: Permission) { return context.permissions.includes(permission) }
export function canManageMember(actor: AuthorizationContext, targetRole: Role) { return actor.role === 'OWNER' || (actor.role === 'ADMIN' && targetRole !== 'OWNER' && targetRole !== 'ADMIN') }
