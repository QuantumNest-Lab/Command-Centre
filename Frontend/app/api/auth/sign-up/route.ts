import { NextResponse } from 'next/server'
import { apiError } from '@/lib/server/errors'
import { AuthService } from '@/lib/server/services/auth-service'

export const runtime = 'nodejs'
export async function POST(request: Request) { try { return NextResponse.json(await new AuthService().signUp(await request.json()), { status: 201 }) } catch (error) { return apiError(error) } }
