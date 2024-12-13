import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'
import { CookieOptions } from '@supabase/ssr'

export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options as any)
          } catch (error) {
            // Handle edge function cookie setting
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete(name, options as any)
          } catch (error) {
            // Handle edge function cookie deletion
          }
        },
      },
    }
  )
}
