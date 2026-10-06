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
    const items = await db()`select a.id,a.action::text as type,case when a.action='CREATED' then 'Client created' when a.action='ARCHIVED' then 'Client archived' when a.metadata->>'event'='client_assignment_changed' then 'Client owner changed' when a.metadata->>'event'='client_status_changed' then 'Client status changed' else 'Client details updated' end as description,coalesce(u.display_name,u.name) as actor,a.created_at as time from activities a left join users u on u.id=a.actor_user_id where a.workspace_id=${context.workspaceId} and a.entity_type='client' and a.entity_id=${client.id}::uuid order by a.created_at desc limit 50`
    return NextResponse.json({ items })
  } catch (error) { return apiError(error) }
}
