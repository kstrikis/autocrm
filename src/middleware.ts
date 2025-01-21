import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

export async function updateSession(request: Request): Promise<Response> {
  logger.methodEntry('updateSession')
  let supabaseResponse = new Response()

  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieString = request.headers.get('cookie') || ''
          return cookieString.split(';').map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return {
              name: name.trim(),
              value: rest.join('=').trim()
            }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.headers.append(
              'Set-Cookie',
              `${name}=${value}${options ? `; ${Object.entries(options).map(([key, value]) => `${key}=${value}`).join('; ')}` : ''}`
            )
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.url.includes('/auth') &&
    !request.url.includes('/login')
  ) {
    logger.info('No user found, redirecting to auth page')
    return Response.redirect(new URL('/auth', request.url))
  }

  logger.methodExit('updateSession')
  return supabaseResponse
} 