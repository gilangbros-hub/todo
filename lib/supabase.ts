import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client initialization with lazy, validated setup.
 *
 * OWASP A02 (Cryptographic Failures) / A05 (Security Misconfiguration):
 * - Validate env vars on first use and fail with a clear error if missing.
 * - Enforce HTTPS in production to prevent credential leakage over plain HTTP.
 * - Never read the service-role key; only the public anon key is used client-side.
 * - Disable session persistence (no tokens in localStorage) since this app uses
 *   a single-player model, reducing the XSS token-theft surface.
 *
 * Lazy initialization allows Next.js to import this module during static analysis
 * and build-time prerendering without crashing when env vars are absent or
 * placeholders. The client is only constructed on the first actual call, at
 * which point real env vars must be present.
 */

let cachedClient: SupabaseClient | null = null;

function assertValidConfig(url: string | undefined, key: string | undefined): asserts url is string {
  if (!url || !key) {
    throw new Error(
      "Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const isProd = process.env.NODE_ENV === "production";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocalhost && !isProd)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use https:// in production.");
  }
}

function buildClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assertValidConfig(url, key);
  return createClient(url, key!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
}

/**
 * Proxy that defers client construction until the first property access.
 * This lets modules importing `supabase` load cleanly during build-time
 * prerendering, while still failing fast at runtime if env vars are invalid.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!cachedClient) {
      cachedClient = buildClient();
    }
    const value = (cachedClient as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === "function" ? value.bind(cachedClient) : value;
  },
});
