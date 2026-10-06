import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (token.length < 20) throw new AppError('NOT_FOUND', 'This invitation is invalid or unavailable.', 404)
    const [invite] = await db()<{ workspace_name: string; role: string; email: string; existing: boolean }[]>`select w.name as workspace_name, i.role, i.email, exists(select 1 from users u where lower(u.email) = lower(i.email)) as existing from workspace_invitations i join workspaces w on w.id = i.workspace_id where i.token_hash = ${hash(token)} and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()`
    if (!invite) throw new AppError('NOT_FOUND', 'This invitation is invalid, expired, revoked, or already used.', 404)
    return NextResponse.json({ workspaceName: invite.workspace_name, role: invite.role, email: invite.email, existingAccount: invite.existing })
  } catch (error) { return apiError(error) }
}
