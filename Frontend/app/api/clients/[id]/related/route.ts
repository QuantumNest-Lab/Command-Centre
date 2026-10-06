import { NextResponse } from 'next/server'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization(), { id } = await params
    if (!context.permissions.includes('clients.view')) throw new AppError('FORBIDDEN', 'You do not have permission to view clients.', 403)
    const [client] = await db()<{ id: string }[]>`select id from clients where id=${id}::uuid and workspace_id=${context.workspaceId} and archived_at is null and (${context.role} <> 'MEMBER' or owner_user_id=${context.userId}::uuid)`
    if (!client) throw new AppError('NOT_FOUND', 'Client not found.', 404)
    const items = await db()`select id,'project'::text as type,name as title,status::text,updated_at as timestamp from projects where workspace_id=${context.workspaceId} and client_id=${client.id}::uuid and archived_at is null union all select id,'requirement',title,status,updated_at from requirements where workspace_id=${context.workspaceId} and client_id=${client.id}::uuid and archived_at is null union all select id,'task',title,status,coalesce(due_at,updated_at) from tasks where workspace_id=${context.workspaceId} and client_id=${client.id}::uuid and archived_at is null union all select id,'meeting',title,status,coalesce(starts_at,updated_at) from meetings where workspace_id=${context.workspaceId} and client_id=${client.id}::uuid and archived_at is null union all select id,'document',title,status,updated_at from documents where workspace_id=${context.workspaceId} and client_id=${client.id}::uuid and archived_at is null union all select id,'finance',title,status,updated_at from finance_records where workspace_id=${context.workspaceId} and client_id=${client.id}::uuid and archived_at is null order by timestamp desc limit 100`
    return NextResponse.json({ items })
  } catch (error) { return apiError(error) }
}
