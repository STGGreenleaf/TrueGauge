import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // TEMP: Bypass auth for local testing
  const bypassAuth = process.env.NODE_ENV === 'development';
  
  // Protected routes - redirect to login if not authenticated
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')
  const isPublicPage = ['/', '/privacy', '/terms', '/manual', '/splash'].includes(request.nextUrl.pathname)
  const isStaticFile = request.nextUrl.pathname.startsWith('/manifest') || 
                       request.nextUrl.pathname.endsWith('.json') ||
                       request.nextUrl.pathname.endsWith('.png') ||
                       request.nextUrl.pathname.endsWith('.ico')

  if (!bypassAuth && !user && !isAuthPage && !isApiRoute && !isAuthCallback && !isPublicPage && !isStaticFile) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and tries to access login page, redirect to dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
