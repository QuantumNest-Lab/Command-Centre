import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password']
export function proxy(request: NextRequest) {
  // Route handlers return their own JSON 401/403 errors. A redirect here is
  // followed by fetch as a sign-in-page 200 and masks API authorization.
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next()
  if (publicPaths.includes(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/invite/') || request.nextUrl.pathname.startsWith('/api/auth') || request.nextUrl.pathname.startsWith('/api/invitations/')) return NextResponse.next()
  if (!request.cookies.get('qnl_session')?.value) return NextResponse.redirect(new URL('/sign-in', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next|favicon.ico|icon.svg|apple-icon.png).*)'] }
