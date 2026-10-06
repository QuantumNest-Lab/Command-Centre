import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(public readonly code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR', message: string, public readonly status: number) {
    super(message)
  }
}

export const apiError = (error: unknown) => {
  if (error instanceof AppError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status })
  if (error instanceof ZodError) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid.', fields: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) } }, { status: 400 })
  console.error('Unhandled API error', error)
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } }, { status: 500 })
}
