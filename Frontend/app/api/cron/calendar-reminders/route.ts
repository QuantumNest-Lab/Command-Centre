import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { sendTransactionalEmail } from '@/lib/server/email'
import { requireCronAuthorization } from '@/lib/server/cron-authorization'

export const runtime = 'nodejs'
type DueReminder = { id: string; email: string; title: string; entity_type: 'task' | 'meeting'; starts_at: string }
export async function POST(request: Request) {
  try { requireCronAuthorization(request) } catch (error) { return NextResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 }) }
  const due = await db()<DueReminder[]>`select r.id,u.email,coalesce(t.title,m.title) as title,r.entity_type,coalesce(t.due_at,m.starts_at) as starts_at from calendar_reminders r join users u on u.id=r.recipient_user_id left join tasks t on r.entity_type='task' and t.id=r.entity_id left join meetings m on r.entity_type='meeting' and m.id=r.entity_id where r.status='PENDING' and r.remind_at <= now() order by r.remind_at asc limit 100`
  let sent = 0
  for (const reminder of due) {
    try {
      const result = await sendTransactionalEmail({ to: reminder.email, subject: `Reminder: ${reminder.title}`, text: `${reminder.entity_type === 'meeting' ? 'Meeting' : 'Task'} reminder: ${reminder.title} at ${new Date(reminder.starts_at).toLocaleString()}.`, html: `<p><strong>${reminder.entity_type === 'meeting' ? 'Meeting' : 'Task'} reminder</strong></p><p>${reminder.title}</p><p>${new Date(reminder.starts_at).toLocaleString()}</p>` })
      if (!result.sent) throw new Error(result.reason)
      await db()`update calendar_reminders set status='SENT',sent_at=now(),last_error=null where id=${reminder.id}::uuid`; sent++
    } catch (error) { await db()`update calendar_reminders set status='FAILED',last_error=${error instanceof Error ? error.message : 'Delivery failed'} where id=${reminder.id}::uuid` }
  }
  return NextResponse.json({ processed: due.length, sent })
}
