import { NextResponse } from 'next/server'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const context = await requireAuthorization()
    const [row] = await db()<{ email: string; first_name: string | null; last_name: string | null; display_name: string | null; avatar_url: string | null; workspace_name: string; company_setup_completed: boolean }[]>`select u.email, u.first_name, u.last_name, u.display_name, u.avatar_url, w.name as workspace_name, w.company_setup_completed from users u join workspaces w on w.id = ${context.workspaceId} where u.id = ${context.userId}`
    if (!row) throw new AppError('NOT_FOUND', 'Account not found.', 404)
    return NextResponse.json({ user: { id: context.userId, email: row.email, firstName: row.first_name, lastName: row.last_name, displayName: row.display_name, avatarUrl: row.avatar_url }, workspace: { id: context.workspaceId, name: row.workspace_name, companySetupComplete: row.company_setup_completed }, membership: { id: context.membershipId, role: context.role, status: 'ACTIVE' }, permissions: context.permissions })
  } catch (error) { return apiError(error) }
}
