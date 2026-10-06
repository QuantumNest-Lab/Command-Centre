import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'
import { createGoogleCalendarEvent } from '@/lib/server/google-calendar'

export const runtime = 'nodejs'
type Meeting = { id: string; title: string; starts_at: string; duration_minutes: number | null; timezone: string; agenda: string | null; attendees: { name: string; email?: string }[]; provider: string; sync_state: string }

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization(), id = z.string().uuid().parse((await params).id)
    if (!context.permissions.includes('meetings.edit')) throw new AppError('FORBIDDEN', 'You do not have permission to sync meetings.', 403)
    const [meeting] = await db()<Meeting[]>`select m.id,m.title,m.starts_at,m.duration_minutes,m.timezone,m.agenda,m.attendees,m.provider,m.sync_state from meetings m join clients c on c.id=m.client_id where m.id=${id}::uuid and m.workspace_id=${context.workspaceId} and m.archived_at is null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)`
    if (!meeting) throw new AppError('NOT_FOUND', 'Meeting not found.', 404)
    if (!meeting.starts_at) throw new AppError('VALIDATION_ERROR', 'A meeting start time is required before syncing.', 400)
    const event = await createGoogleCalendarEvent(context.workspaceId, { id: meeting.id, title: meeting.title, startsAt: meeting.starts_at, durationMinutes: meeting.duration_minutes, timezone: meeting.timezone, agenda: meeting.agenda, attendees: meeting.attendees, provider: meeting.provider })
    if (!event) throw new AppError('VALIDATION_ERROR', 'Connect Google Calendar in Settings before syncing this meeting.', 400)
    const [item] = await db()`update meetings set provider_event_id=${event.eventId},meeting_url=coalesce(${event.meetingUrl},meeting_url),sync_state='SYNCED' where id=${id}::uuid and workspace_id=${context.workspaceId} returning id,provider_event_id,meeting_url,sync_state`
    return NextResponse.json({ item })
  } catch (error) {
    return apiError(error)
  }
}
