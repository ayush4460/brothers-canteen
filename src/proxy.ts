import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /vendor routes
  if (pathname.startsWith('/vendor')) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protect /c routes (Customer)
  if (pathname.startsWith('/c') && !pathname.startsWith('/c/login')) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/c/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/vendor/:path*', '/c/:path*'],
}
