import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/lib/server/db'
import { encryptIntegrationPayload } from '@/lib/server/google-calendar'
import { requireAuthorization } from '@/lib/server/authorization'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const stateCookie = 'qnl_google_oauth_state'
const sessionKey = () => new TextEncoder().encode(process.env.SESSION_SECRET || '')
const redirect = (request: Request, message: string) => NextResponse.redirect(new URL(`/settings/integrations?google=${encodeURIComponent(message)}`, request.url))
export async function GET(request: Request) {
  try {
    const context = await requireAuthorization()
    if (!context.permissions.includes('settings.integrations')) return NextResponse.json({ error: { message: 'Forbidden.' } }, { status: 403 })
    const url = new URL(request.url), code=url.searchParams.get('code'), state=url.searchParams.get('state'), saved=(await cookies()).get(stateCookie)?.value
    if (!code || !state || state !== saved) return NextResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 })
    const verified = await jwtVerify(state, sessionKey(), { issuer: undefined }); const workspaceId=verified.payload.workspaceId
    if (typeof workspaceId !== 'string' || workspaceId !== context.workspaceId || verified.payload.userId !== context.userId) return NextResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 })
    const clientId=process.env.GOOGLE_OAUTH_CLIENT_ID, clientSecret=process.env.GOOGLE_OAUTH_CLIENT_SECRET, redirectUri=process.env.GOOGLE_OAUTH_REDIRECT_URI
    if (!clientId || !clientSecret || !redirectUri) return redirect(request, 'server_configuration_required')
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'})}), token=await response.json() as Record<string,unknown>
    if (!response.ok || typeof token.access_token !== 'string') return redirect(request, 'token_exchange_failed')
    const encrypted=encryptIntegrationPayload({ ...token, expiry_date: Date.now() + Number(token.expires_in || 3600) * 1000 })
    await db().begin(async sql => { for (const provider of ['GOOGLE_DRIVE','GOOGLE_CALENDAR']) { const [connection]=await sql<{id:string}[]>`insert into integration_connections(workspace_id,provider,display_name,status,connected_at,connected_by_user_id,last_error) values(${workspaceId}::uuid,${provider}::integration_provider,${provider==='GOOGLE_DRIVE'?'Google Drive':'Google Calendar'},'CONNECTED'::integration_status,now(),${verified.payload.userId as string}::uuid,null) on conflict(workspace_id,provider) do update set status='CONNECTED',connected_at=now(),connected_by_user_id=excluded.connected_by_user_id,last_error=null returning id`; await sql`insert into integration_credentials(integration_connection_id,encrypted_payload) values(${connection.id}::uuid,${encrypted}) on conflict(integration_connection_id) do update set encrypted_payload=excluded.encrypted_payload` } })
    ;(await cookies()).delete(stateCookie); return redirect(request, 'connected')
  } catch (error) { return error instanceof AppError ? apiError(error) : redirect(request, 'connection_failed') }
}
