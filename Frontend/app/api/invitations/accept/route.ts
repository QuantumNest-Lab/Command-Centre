import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'
import { getSession, createSession } from '@/lib/server/session'
import { passwordSchema } from '@/lib/server/validation'

export const runtime = 'nodejs'
const schema = z.object({ token: z.string().min(20).max(512), name: z.string().trim().min(2).max(120).optional(), password: passwordSchema.optional() })
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
type Invitation = { id: string; workspace_id: string; email: string; role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' }

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json())
    const [invitation] = await db()<Invitation[]>`select id, workspace_id, email, role from workspace_invitations where token_hash = ${tokenHash(input.token)} and accepted_at is null and revoked_at is null and expires_at > now()`
    if (!invitation) throw new AppError('NOT_FOUND', 'This invitation is invalid, expired, revoked, or already used.', 404)
    const session = await getSession()
    const result = await db().begin(async sql => {
      let userId: string
      if (session) {
        const [user] = await sql<{ id: string; email: string; account_status: 'ACTIVE' | 'DISABLED' }[]>`select id, email, account_status from users where id = ${session.userId}`
        if (!user || user.account_status !== 'ACTIVE' || user.email.toLowerCase() !== invitation.email.toLowerCase()) throw new AppError('FORBIDDEN', 'Sign in with the email address that received this invitation.', 403)
        userId = user.id
      } else {
        if (!input.name || !input.password) throw new AppError('VALIDATION_ERROR', 'Name and a password of at least 10 characters are required to accept this invitation.', 400)
        const [existing] = await sql<{ id: string }[]>`select id from users where lower(email) = lower(${invitation.email})`
        if (existing) throw new AppError('CONFLICT', 'An account already exists for this email. Sign in, then accept the invitation.', 409)
        const names = input.name.split(/\s+/)
        const [user] = await sql<{ id: string }[]>`insert into users (name, first_name, last_name, display_name, email, password_hash) values (${input.name}, ${names[0]}, ${names.slice(1).join(' ') || null}, ${input.name}, ${invitation.email.toLowerCase()}, ${await bcrypt.hash(input.password, 12)}) returning id`
        userId = user.id
      }
      await sql`insert into workspace_memberships (workspace_id, user_id, role, status, joined_at, invited_at) values (${invitation.workspace_id}, ${userId}, ${invitation.role}::workspace_role, 'ACTIVE'::membership_status, now(), now()) on conflict (workspace_id, user_id) do update set role = excluded.role, status = 'ACTIVE'::membership_status, joined_at = coalesce(workspace_memberships.joined_at, now())`
      await sql`update workspace_invitations set accepted_at = now() where id = ${invitation.id} and accepted_at is null`
      await sql`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${invitation.workspace_id}, ${userId}, 'membership', ${userId}::uuid, 'CREATED'::activity_action, ${JSON.stringify({ event: 'member_joined', invitationId: invitation.id })}::jsonb)`
      return { userId, workspaceId: invitation.workspace_id }
    })
    if (!session) await createSession({ ...result, role: invitation.role })
    return NextResponse.json({ ok: true, workspaceId: result.workspaceId })
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError('VALIDATION_ERROR', 'Invitation details are invalid.', 400) : error) }
}
