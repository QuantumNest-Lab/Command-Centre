import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { AppError } from './errors'

const COOKIE_NAME = 'qnl_session'
const issuer = 'qnl-command-centre'
const secret = () => {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) throw new AppError('INTERNAL_ERROR', 'Session configuration is unavailable.', 500)
  return new TextEncoder().encode(value)
}

export type Session = { userId: string; workspaceId: string; role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' }

export async function createSession(session: Session) {
  const token = await new SignJWT(session).setProtectedHeader({ alg: 'HS256' }).setIssuer(issuer).setIssuedAt().setExpirationTime('7d').sign(secret())
  const store = await cookies()
  store.set(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 })
}

export async function clearSession() { (await cookies()).delete(COOKIE_NAME) }

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer })
    if (typeof payload.userId !== 'string' || typeof payload.workspaceId !== 'string' || !['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(String(payload.role))) return null
    return { userId: payload.userId, workspaceId: payload.workspaceId, role: payload.role as Session['role'] }
  } catch { return null }
}
