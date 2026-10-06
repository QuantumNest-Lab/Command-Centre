import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(25), cursor: z.string().max(300).optional(), entityType: z.string().trim().min(1).max(64).optional(), action: z.enum(['CREATED', 'UPDATED', 'ARCHIVED', 'STATUS_CHANGED']).optional(), actorId: z.string().uuid().optional(), clientId: z.string().uuid().optional(), projectId: z.string().uuid().optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional() })
type Cursor = { createdAt: string; id: string }
type ActivityRow = { id: string; entity_type: string; entity_id: string; action: string; title: string; actor: string; actor_id: string | null; client_id: string | null; client_name: string | null; project_id: string | null; project_name: string | null; created_at: string }
const decodeCursor = (value: string | undefined): Cursor | null => { if (!value) return null; try { return z.object({ createdAt: z.string().datetime(), id: z.string().uuid() }).parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))) } catch { throw new AppError('VALIDATION_ERROR', 'The activity cursor is invalid.', 400) } }
const encodeCursor = (row: Pick<ActivityRow, 'created_at' | 'id'>) => Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id })).toString('base64url')

export async function GET(request: Request) {
  try {
    const context = await requireAuthorization()
    if (!context.permissions.includes('activity.view')) throw new AppError('FORBIDDEN', 'You do not have permission to view activity.', 403)
    const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams)), cursor = decodeCursor(input.cursor)
    const rows = await db()<ActivityRow[]>`
      select a.id,a.entity_type,a.entity_id,a.action::text,
        coalesce(a.metadata->>'name',a.metadata->>'event',c_direct.name,p_direct.name,r.title,t.title,m.title,d.title,f.title,ap.title,fo.name,a.entity_type) as title,
        coalesce(u.display_name,u.name,'System') as actor,a.actor_user_id as actor_id,
        coalesce(c_direct.id,c_related.id) as client_id,coalesce(c_direct.name,c_related.name) as client_name,
        coalesce(p_direct.id,p_related.id) as project_id,coalesce(p_direct.name,p_related.name) as project_name,a.created_at
      from activities a left join users u on u.id=a.actor_user_id
      left join clients c_direct on a.entity_type='client' and c_direct.id=a.entity_id
      left join projects p_direct on a.entity_type='project' and p_direct.id=a.entity_id
      left join requirements r on a.entity_type='requirement' and r.id=a.entity_id left join tasks t on a.entity_type='task' and t.id=a.entity_id
      left join meetings m on a.entity_type='meeting' and m.id=a.entity_id left join documents d on a.entity_type='document' and d.id=a.entity_id
      left join finance_records f on a.entity_type='finance' and f.id=a.entity_id left join approvals ap on a.entity_type='approval' and ap.id=a.entity_id
      left join file_objects fo on a.entity_type='file' and fo.id=a.entity_id
      left join clients c_related on c_related.id=coalesce(r.client_id,t.client_id,m.client_id,d.client_id,f.client_id,ap.client_id,p_direct.client_id)
      left join projects p_related on p_related.id=coalesce(r.project_id,t.project_id,m.project_id,d.project_id,f.project_id,ap.project_id)
      where a.workspace_id=${context.workspaceId} and (${input.entityType || ''}='' or a.entity_type=${input.entityType || ''}) and (${input.action || ''}='' or a.action::text=${input.action || ''})
        and (${input.actorId || null}::uuid is null or a.actor_user_id=${input.actorId || null}::uuid) and (${input.clientId || null}::uuid is null or coalesce(c_direct.id,c_related.id)=${input.clientId || null}::uuid)
        and (${input.projectId || null}::uuid is null or coalesce(p_direct.id,p_related.id)=${input.projectId || null}::uuid) and (${input.from || null}::timestamptz is null or a.created_at>=${input.from || null}::timestamptz)
        and (${input.to || null}::timestamptz is null or a.created_at<=${input.to || null}::timestamptz) and (${cursor?.createdAt || null}::timestamptz is null or (a.created_at,a.id)<(${cursor?.createdAt || null}::timestamptz,${cursor?.id || null}::uuid))
      order by a.created_at desc,a.id desc limit ${input.limit + 1}`
    const hasMore = rows.length > input.limit, items = hasMore ? rows.slice(0, input.limit) : rows
    return NextResponse.json({ items, page: { hasMore, nextCursor: hasMore && items.length ? encodeCursor(items.at(-1)!) : null } })
  } catch (error) { return apiError(error) }
}
