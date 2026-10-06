import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { canManageMember, requirePermission, type Role } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const inviteSchema = z.object({ email: z.string().trim().email().max(255), role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER') })
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function GET() {
  try {
    const context = await requirePermission('team.view')
    const members = await db()<any[]>`select m.id, m.role, m.status, m.joined_at, m.invited_at, u.id as user_id, u.name, u.email, u.display_name, u.avatar_url, u.last_login_at from workspace_memberships m join users u on u.id = m.user_id where m.workspace_id = ${context.workspaceId} order by case m.role when 'OWNER' then 0 when 'ADMIN' then 1 when 'MANAGER' then 2 else 3 end, u.name`
    return NextResponse.json({ items: members })
  } catch (error) { return apiError(error) }
}

export async function POST(request: Request) {
  try {
    const context = await requirePermission('team.invite'), input = inviteSchema.parse(await request.json())
    if (!canManageMember(context, input.role)) throw new AppError('FORBIDDEN', 'You cannot assign that role.', 403)
    const existing = await db()<{ id: string; status: string }[]>`select m.id, m.status from workspace_memberships m join users u on u.id = m.user_id where m.workspace_id = ${context.workspaceId} and lower(u.email) = lower(${input.email})`
    if (existing[0] && existing[0].status !== 'REMOVED') throw new AppError('CONFLICT', 'This person already belongs to the workspace.', 409)
    const token = randomBytes(32).toString('base64url')
    await db()`insert into workspace_invitations (workspace_id, email, role, token_hash, invited_by_user_id, expires_at) values (${context.workspaceId}, ${input.email.toLowerCase()}, ${input.role}::workspace_role, ${hashToken(token)}, ${context.userId}, now() + interval '7 days')`
    await db()`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${context.workspaceId}, ${context.userId}, 'membership', ${context.membershipId}::uuid, 'CREATED'::activity_action, ${JSON.stringify({ event: 'member_invited', email: input.email, role: input.role })}::jsonb)`
    return NextResponse.json({ invitationUrl: `${new URL(request.url).origin}/invite/${token}`, expiresInDays: 7 }, { status: 201 })
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError('VALIDATION_ERROR', 'Enter a valid email and role.', 400) : error) }
}
