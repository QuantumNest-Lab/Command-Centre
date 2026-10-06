import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { db } from './db'

type Token = { access_token: string; refresh_token?: string; expiry_date?: number; expires_in?: number; token_type?: string; scope?: string }
type Connection = { id: string; encrypted_payload: string }
export type CalendarMeeting = { id: string; title: string; startsAt: string; durationMinutes: number | null; timezone: string; agenda: string | null; attendees: { name: string; email?: string }[]; provider: string }

const key = () => { const encoded = process.env.INTEGRATION_ENCRYPTION_KEY; if (!encoded) throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured.'); const value = Buffer.from(encoded, 'base64'); if (value.length !== 32) throw new Error('INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.'); return value }
export const encryptIntegrationPayload = (payload: unknown) => { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv), data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64') }
const decrypt = (payload: string): Token => { const data = Buffer.from(payload, 'base64'), iv = data.subarray(0, 12), tag = data.subarray(12, 28), encrypted = data.subarray(28), decipher = createDecipheriv('aes-256-gcm', key(), iv); decipher.setAuthTag(tag); return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')) as Token }

async function tokenFor(connection: Connection) {
  let token = decrypt(connection.encrypted_payload)
  if (!token.access_token) throw new Error('The Google connection has no access token.')
  if (!token.expiry_date || token.expiry_date > Date.now() + 60_000) return token
  if (!token.refresh_token || !process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) throw new Error('Reconnect Google to refresh its expired authorization.')
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: token.refresh_token, grant_type: 'refresh_token' }) }), body = await response.json() as Record<string, unknown>
  if (!response.ok || typeof body.access_token !== 'string') throw new Error('Google authorization refresh failed.')
  token = { ...token, ...body, refresh_token: token.refresh_token, expiry_date: Date.now() + Number(body.expires_in || 3600) * 1000 }
  await db()`update integration_credentials set encrypted_payload=${encryptIntegrationPayload(token)} where integration_connection_id=${connection.id}::uuid`
  return token
}

export async function googleAccessToken(workspaceId: string, provider: 'GOOGLE_DRIVE' | 'GOOGLE_CALENDAR') {
  const [connection] = await db()<Connection[]>`select c.id,ic.encrypted_payload from integration_connections c join integration_credentials ic on ic.integration_connection_id=c.id where c.workspace_id=${workspaceId}::uuid and c.provider=${provider}::integration_provider and c.status='CONNECTED'::integration_status`
  if (!connection) return null
  return tokenFor(connection)
}

export async function createGoogleCalendarEvent(workspaceId: string, meeting: CalendarMeeting) {
  const token = await googleAccessToken(workspaceId, 'GOOGLE_CALENDAR')
  if (!token) return null
  const endsAt = new Date(new Date(meeting.startsAt).getTime() + (meeting.durationMinutes || 30) * 60_000).toISOString()
  const event = { summary: meeting.title, description: meeting.agenda || undefined, start: { dateTime: meeting.startsAt, timeZone: meeting.timezone }, end: { dateTime: endsAt, timeZone: meeting.timezone }, attendees: meeting.attendees.filter(person => person.email).map(person => ({ email: person.email, displayName: person.name })), ...(meeting.provider === 'GOOGLE_MEET' ? { conferenceData: { createRequest: { requestId: meeting.id } } } : {}) }
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', { method: 'POST', headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify(event) }), body = await response.json() as { id?: string; hangoutLink?: string; htmlLink?: string; error?: { message?: string } }
  if (!response.ok || !body.id) throw new Error(body.error?.message || 'Google Calendar event creation failed.')
  return { eventId: body.id, meetingUrl: body.hangoutLink || body.htmlLink || null }
}
