import { NextResponse } from 'next/server'
import { apiError } from '@/lib/server/errors'
import { clearSession } from '@/lib/server/session'

export const runtime = 'nodejs'
export async function POST() { try { await clearSession(); return new NextResponse(null, { status: 204 }) } catch (error) { return apiError(error) } }
