import type { NextResponse } from 'next/server'
import { requirePermission, type AuthorizationContext, type Permission } from './authorization'

/** Resolves authorization before a protected handler can parse request input or access data. */
export function withPermission<T>(permission: Permission, handler: (context: AuthorizationContext) => Promise<NextResponse>) {
  return async (): Promise<NextResponse> => handler(await requirePermission(permission))
}
