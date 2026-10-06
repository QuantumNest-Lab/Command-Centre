import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const query = z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() })
type Item = { id: string; type: 'task' | 'meeting'; title: string; starts_at: string; ends_at: string | null; status: string; client_name: string; project_name: string | null }

export async function GET(request: Request) {
  try {
    const context = await requireAuthorization()
    if (!context.permissions.includes('tasks.view') && !context.permissions.includes('meetings.view')) throw new AppError('FORBIDDEN', 'You do not have permission to view the calendar.', 403)
    const data = query.parse(Object.fromEntries(new URL(request.url).searchParams))
    const items = await db()<Item[]>`
      select t.id, 'task'::text as type, t.title, t.due_at as starts_at, null::timestamptz as ends_at, t.status, c.name as client_name, p.name as project_name
      from tasks t join clients c on c.id=t.client_id left join projects p on p.id=t.project_id
      where t.workspace_id=${context.workspaceId} and t.archived_at is null and t.due_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
        and (${data.from || null}::timestamptz is null or t.due_at >= ${data.from || null}::timestamptz) and (${data.to || null}::timestamptz is null or t.due_at <= ${data.to || null}::timestamptz)
      union all
      select m.id, 'meeting'::text, m.title, m.starts_at, m.starts_at + (coalesce(m.duration_minutes, 30) * interval '1 minute'), m.status, c.name, p.name
      from meetings m join clients c on c.id=m.client_id left join projects p on p.id=m.project_id
      where m.workspace_id=${context.workspaceId} and m.archived_at is null and m.starts_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
        and (${data.from || null}::timestamptz is null or m.starts_at >= ${data.from || null}::timestamptz) and (${data.to || null}::timestamptz is null or m.starts_at <= ${data.to || null}::timestamptz)
      order by starts_at asc`
    return NextResponse.json({ items })
  } catch (error) { return apiError(error) }
}
