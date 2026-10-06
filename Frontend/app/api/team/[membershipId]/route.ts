import { NextResponse } from 'next/server'
import { z } from 'zod'
import { canManageMember, requireAuthorization, requirePermission, type Role } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
// Ownership transfer is deliberately a separate future workflow; ordinary role edits can never grant Owner.
const schema = z.object({ role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(), status: z.enum(['ACTIVE', 'SUSPENDED', 'REMOVED']).optional(), reassignClientOwnerUserId: z.string().uuid().optional() }).refine(value => value.role || value.status, 'Provide a role or status change.')
type Target = { id: string; user_id: string; role: Role; status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED' }
export async function PATCH(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const context = await requireAuthorization()
    const input = schema.parse(await request.json()), { membershipId } = await params
    if (input.role) await requirePermission('team.edit_role'); else if (input.status === 'SUSPENDED' || input.status === 'ACTIVE') await requirePermission('team.suspend'); else await requirePermission('team.remove')
    const [target] = await db()<Target[]>`select id, user_id, role, status from workspace_memberships where id = ${membershipId}::uuid and workspace_id = ${context.workspaceId}`
    if (!target) throw new AppError('NOT_FOUND', 'Member not found in this workspace.', 404)
    if (!canManageMember(context, target.role) || (input.role && !canManageMember(context, input.role))) throw new AppError('FORBIDDEN', 'You cannot change this member.', 403)
    if (target.user_id === context.userId) throw new AppError('FORBIDDEN', 'You cannot change your own role or membership.', 403)
    if (input.status === 'SUSPENDED' || input.status === 'REMOVED') {
      const [{ count }] = await db()<{ count: string }[]>`select count(*)::text as count from clients where workspace_id = ${context.workspaceId} and owner_user_id = ${target.user_id} and archived_at is null`
      if (Number(count) > 0) {
        if (!input.reassignClientOwnerUserId || input.reassignClientOwnerUserId === target.user_id) throw new AppError('CONFLICT', `Reassign ${count} active client ownership record(s) before suspending or removing this member.`, 409)
        const [replacement] = await db()<{ user_id: string }[]>`select user_id from workspace_memberships where workspace_id = ${context.workspaceId} and user_id = ${input.reassignClientOwnerUserId}::uuid and status = 'ACTIVE'::membership_status`
        if (!replacement) throw new AppError('VALIDATION_ERROR', 'Replacement client owner must be an active workspace member.', 400)
        await db()`update clients set owner_user_id = ${replacement.user_id}, updated_at = now() where workspace_id = ${context.workspaceId} and owner_user_id = ${target.user_id} and archived_at is null`
        await db()`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${context.workspaceId}, ${context.userId}, 'membership', ${membershipId}::uuid, 'UPDATED'::activity_action, ${JSON.stringify({ event: 'client_ownership_reassigned_before_membership_change', fromUserId: target.user_id, toUserId: input.reassignClientOwnerUserId, count: Number(count) })}::jsonb)`
      }
    }
    if (target.role === 'OWNER' && (input.role || input.status && input.status !== 'ACTIVE')) {
      const [{ count }] = await db()<{ count: string }[]>`select count(*)::text as count from workspace_memberships where workspace_id = ${context.workspaceId} and role = 'OWNER'::workspace_role and status = 'ACTIVE'::membership_status`
      if (Number(count) <= 1) throw new AppError('CONFLICT', 'Transfer ownership before changing or removing the only active Owner.', 409)
    }
    const [member] = await db()<any[]>`update workspace_memberships set role = coalesce(${input.role ?? null}::workspace_role, role), status = coalesce(${input.status ?? null}::membership_status, status), joined_at = case when ${input.status ?? null}::membership_status = 'ACTIVE'::membership_status then coalesce(joined_at, now()) else joined_at end where id = ${membershipId}::uuid returning id, role, status`
    await db()`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${context.workspaceId}, ${context.userId}, 'membership', ${membershipId}::uuid, 'UPDATED'::activity_action, ${JSON.stringify({ event: input.role ? 'role_changed' : `member_${input.status?.toLowerCase()}`, oldRole: target.role, newRole: input.role })}::jsonb)`
    return NextResponse.json(member)
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError('VALIDATION_ERROR', error.issues[0]?.message || 'Invalid membership change.', 400) : error) }
}
