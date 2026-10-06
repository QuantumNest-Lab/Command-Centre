import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { requireAuthorization } from '@/lib/server/authorization'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const stateCookie = 'qnl_google_oauth_state'
const key = () => { const secret = process.env.SESSION_SECRET; if (!secret || secret.length < 32) throw new AppError('INTERNAL_ERROR', 'Session configuration is unavailable.', 500); return new TextEncoder().encode(secret) }
export async function GET() {
  try {
    const context = await requireAuthorization()
    if (!context.permissions.includes('settings.integrations')) throw new AppError('FORBIDDEN', 'You do not have permission to connect integrations.', 403)
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID, redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
    if (!clientId || !redirectUri) throw new AppError('VALIDATION_ERROR', 'Google OAuth is not configured by the server administrator. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI.', 400)
    const state = await new SignJWT({ workspaceId: context.workspaceId, userId: context.userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(key())
    ;(await cookies()).set(stateCookie, state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/integrations/google', maxAge: 600 })
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth'); url.searchParams.set('client_id', clientId); url.searchParams.set('redirect_uri', redirectUri); url.searchParams.set('response_type', 'code'); url.searchParams.set('access_type', 'offline'); url.searchParams.set('prompt', 'consent'); url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar') ; url.searchParams.set('state', state)
    return NextResponse.redirect(url)
  } catch (error) { return apiError(error) }
}
