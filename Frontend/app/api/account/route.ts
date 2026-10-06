import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'
import { requireAuthorization } from '@/lib/server/authorization'
import { z } from 'zod'

export const runtime = 'nodejs'

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  displayName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255),
})

export async function GET() {
  try {
    const context = await requireAuthorization()
    const [user] = await db()<{ name: string; email: string; firstName: string | null; lastName: string | null; displayName: string | null }[]>`select name, email, first_name as "firstName", last_name as "lastName", display_name as "displayName" from users where id = ${context.userId}`
    if (!user) throw new AppError('NOT_FOUND', 'Account not found.', 404)
    return NextResponse.json(user)
  } catch (error) { return apiError(error) }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireAuthorization()
    const data = profileSchema.parse(await request.json())
    const name = `${data.firstName} ${data.lastName}`.trim()
    const [user] = await db()<{ name: string; email: string; firstName: string; lastName: string; displayName: string }[]>`update users set name = ${name}, first_name = ${data.firstName}, last_name = ${data.lastName || null}, display_name = ${data.displayName || name}, email = ${data.email.toLowerCase()}, updated_at = now() where id = ${context.userId} returning name, email, first_name as "firstName", last_name as "lastName", display_name as "displayName"`
    if (!user) throw new AppError('NOT_FOUND', 'Account not found.', 404)
    return NextResponse.json(user)
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') return apiError(new AppError('CONFLICT', 'That email address is already in use.', 409))
    if (error instanceof z.ZodError) return apiError(new AppError('VALIDATION_ERROR', 'Enter valid profile details and email address.', 400))
    return apiError(error)
  }
}
