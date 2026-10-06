import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const input = z.object({ entityType: z.enum(['task', 'meeting']), entityId: z.string().uuid(), remindAt: z.string().datetime() })
export async function POST(request: Request) {
  try {
    const context = await requireAuthorization(); const data = input.parse(await request.json())
    if (!context.permissions.includes(data.entityType === 'task' ? 'tasks.edit' : 'meetings.edit')) throw new AppError('FORBIDDEN', 'You do not have permission to set this reminder.', 403)
    if (new Date(data.remindAt) <= new Date()) throw new AppError('VALIDATION_ERROR', 'Reminder time must be in the future.', 400)
    const [entity] = data.entityType === 'task'
      ? await db()<{ id: string }[]>`select id from tasks where id=${data.entityId}::uuid and workspace_id=${context.workspaceId} and archived_at is null`
      : await db()<{ id: string }[]>`select id from meetings where id=${data.entityId}::uuid and workspace_id=${context.workspaceId} and archived_at is null`
    if (!entity) throw new AppError('NOT_FOUND', 'Calendar item was not found.', 404)
    const [item] = await db()<{ id: string; remind_at: string; status: string }[]>`insert into calendar_reminders(workspace_id,entity_type,entity_id,recipient_user_id,remind_at) values(${context.workspaceId},${data.entityType},${data.entityId}::uuid,${context.userId}::uuid,${data.remindAt}::timestamptz) on conflict(workspace_id,entity_type,entity_id,recipient_user_id,remind_at) do update set status='PENDING',last_error=null returning id,remind_at,status`
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) { return apiError(error) }
}
