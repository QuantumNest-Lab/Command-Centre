import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError } from '@/lib/server/errors'
import { verifyEmail } from '@/lib/server/services/auth-email-service'

export const runtime = 'nodejs'
export async function POST(request: Request) { try { const { token } = z.object({ token: z.string().min(20).max(200) }).parse(await request.json()); await verifyEmail(token); return NextResponse.json({ ok: true }) } catch (error) { return apiError(error) } }
