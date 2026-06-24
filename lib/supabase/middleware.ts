import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Treat auth errors (expired token, network issue) as unauthenticated
    return { user: null, supabaseResponse };
  }

  // Enforce 1-day (24 hour) session limit
  const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
  if (Date.now() - lastSignIn > ONE_DAY_MS) {
    // Session too old — clear it
    await supabase.auth.signOut();
    return { user: null, supabaseResponse };
  }

  return { user, supabaseResponse };
}
