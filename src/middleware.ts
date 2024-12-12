import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if the request is for the dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      // Redirect unauthenticated users to the login page
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Check if user has moderator role
    const { data: roleData, error: roleError } = await supabase
      .rpc('auth.user_has_role', { role: 'moderator' })

    if (roleError || !roleData) {
      // Redirect non-moderators to the home page
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return res
}

// Specify which routes to run the middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
