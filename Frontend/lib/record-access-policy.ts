import type { Permission, Role } from './authorization-policy'

/** Reusable ownership policy for workspace records. Future project/task policies can use the same context shape. */
export type RecordAuthorizationContext = { userId: string; role: Role; permissions: readonly Permission[] }
export type OwnedWorkspaceRecord = { ownerUserId: string | null }
const has = (context: RecordAuthorizationContext, permission: Permission) => context.permissions.includes(permission)
const elevated = (context: RecordAuthorizationContext, allPermission: Permission) => context.role !== 'MEMBER' || has(context, allPermission)
export const canViewRecord = (context: RecordAuthorizationContext, record: OwnedWorkspaceRecord, allPermission: Permission) => elevated(context, allPermission) || record.ownerUserId === context.userId
export const canEditClient = (context: RecordAuthorizationContext, record: OwnedWorkspaceRecord) => has(context, 'clients.edit') && canViewRecord(context, record, 'clients.view_all')
export const canArchiveClient = (context: RecordAuthorizationContext, record: OwnedWorkspaceRecord) => has(context, 'clients.archive') && canViewRecord(context, record, 'clients.view_all')
export const canAssignClient = (context: RecordAuthorizationContext, record?: OwnedWorkspaceRecord) => has(context, 'clients.assign') && (!record || canViewRecord(context, record, 'clients.view_all'))
