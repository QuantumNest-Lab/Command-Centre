import { NextResponse } from 'next/server'
import { apiError } from '@/lib/server/errors'
import { AuthService } from '@/lib/server/services/auth-service'

export const runtime = 'nodejs'
export async function POST(request: Request) { try { return NextResponse.json(await new AuthService().signIn(await request.json())) } catch (error) { return apiError(error) } }
