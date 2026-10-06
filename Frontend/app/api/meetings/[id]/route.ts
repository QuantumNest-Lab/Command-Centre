import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const idSchema = z.string().uuid()
const updateSchema = z.object({ title: z.string().trim().min(2).max(240).optional(), startsAt: z.string().datetime().optional(), durationMinutes: z.number().int().min(1).max(1440).nullable().optional(), timezone: z.string().trim().min(1).max(80).optional(), meetingUrl: z.string().url().max(2048).nullable().optional(), attendees: z.array(z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(255).optional() })).max(200).optional(), agenda: z.string().trim().max(10_000).nullable().optional(), notes: z.string().trim().max(20_000).nullable().optional(), outcome: z.string().trim().max(10_000).nullable().optional(), status: z.enum(['COMPLETED', 'CANCELED', 'NO_SHOW']).optional() }).refine(data => Object.keys(data).length > 0, 'Choose a meeting update.')
type Meeting = { id: string; title: string; status: string; client_id: string; project_id: string | null }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization(), id = idSchema.parse((await params).id), data = updateSchema.parse(await request.json())
    if (!context.permissions.includes('meetings.edit')) throw new AppError('FORBIDDEN', 'You do not have permission to update meetings.', 403)
    const [meeting] = await db()<Meeting[]>`select m.id,m.title,m.status,m.client_id,m.project_id from meetings m join clients c on c.id=m.client_id where m.id=${id}::uuid and m.workspace_id=${context.workspaceId} and m.archived_at is null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)`
    if (!meeting) throw new AppError('NOT_FOUND', 'Meeting not found.', 404)
    if (data.status && meeting.status !== 'SCHEDULED') throw new AppError('VALIDATION_ERROR', 'Only scheduled meetings can be completed, cancelled, or marked no-show.', 400)
    if (data.status === 'CANCELED' && !context.permissions.includes('meetings.cancel')) throw new AppError('FORBIDDEN', 'You do not have permission to cancel meetings.', 403)
    const [item] = await db().begin(async sql => { const [updated] = await sql`update meetings set title=coalesce(${data.title ?? null},title),starts_at=coalesce(${data.startsAt ?? null}::timestamptz,starts_at),duration_minutes=case when ${data.durationMinutes !== undefined} then ${data.durationMinutes ?? null} else duration_minutes end,timezone=coalesce(${data.timezone ?? null},timezone),meeting_url=case when ${data.meetingUrl !== undefined} then ${data.meetingUrl ?? null} else meeting_url end,attendees=case when ${data.attendees !== undefined} then ${JSON.stringify(data.attendees)}::jsonb else attendees end,agenda=case when ${data.agenda !== undefined} then ${data.agenda ?? null} else agenda end,notes=case when ${data.notes !== undefined} then ${data.notes ?? null} else notes end,outcome=case when ${data.outcome !== undefined} then ${data.outcome ?? null} else outcome end,status=coalesce(${data.status ?? null},status) where id=${id}::uuid and workspace_id=${context.workspaceId} returning id,title,status,starts_at,duration_minutes,timezone,meeting_url,attendees,agenda,notes,outcome,provider,sync_state`; await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'meeting',${id}::uuid,${data.status ? 'STATUS_CHANGED' : 'UPDATED'}::activity_action,${JSON.stringify({ name: updated.title, status: data.status || undefined })}::jsonb)`; return [updated] }); return NextResponse.json({ item })
  } catch (error) { return apiError(error) }
}
