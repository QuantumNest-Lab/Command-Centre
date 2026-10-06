import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'
import { passwordSchema } from '@/lib/server/validation'

export const runtime = 'nodejs'
const schema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema, confirmPassword: z.string().min(1).max(128) }).refine(data => data.newPassword === data.confirmPassword, { message: 'Passwords do not match.' })
export async function PATCH(request: Request) {
  try {
    const context = await requireAuthorization(), input = schema.parse(await request.json())
    const [user] = await db()<{ password_hash: string }[]>`select password_hash from users where id = ${context.userId}`
    if (!user || !(await bcrypt.compare(input.currentPassword, user.password_hash))) throw new AppError('UNAUTHORIZED', 'Your current password is incorrect.', 401)
    await db()`update users set password_hash = ${await bcrypt.hash(input.newPassword, 12)} where id = ${context.userId}`
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError('VALIDATION_ERROR', error.issues[0]?.message || 'Password is invalid.', 400) : error) }
}
