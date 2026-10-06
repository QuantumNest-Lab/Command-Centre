import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError } from '@/lib/server/errors'
import { requestPasswordReset, resetPassword } from '@/lib/server/services/auth-email-service'
import { passwordSchema } from '@/lib/server/validation'

export const runtime = 'nodejs'
const requestSchema = z.object({ email: z.string().trim().email().max(255) })
const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema })
export async function POST(request: Request) { try { await requestPasswordReset(requestSchema.parse(await request.json()).email); return NextResponse.json({ ok: true }) } catch (error) { return apiError(error) } }
export async function PATCH(request: Request) { try { const value = resetSchema.parse(await request.json()); await resetPassword(value.token, value.password); return NextResponse.json({ ok: true }) } catch (error) { return apiError(error) } }
