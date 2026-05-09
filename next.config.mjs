/** @type {import('next').NextConfig} */

/**
 * Security headers following OWASP recommendations.
 *
 * - Content-Security-Policy: mitigates XSS (A03) by whitelisting script/style sources.
 *   Supabase domains are whitelisted for API + real-time WebSocket.
 * - X-Frame-Options: prevents clickjacking (A05).
 * - X-Content-Type-Options: prevents MIME sniffing (A05).
 * - Referrer-Policy: limits referrer leakage (A01).
 * - Permissions-Policy: disables unused browser APIs (A05).
 * - Strict-Transport-Security: enforces HTTPS (A02) — only meaningful over HTTPS.
 * - X-DNS-Prefetch-Control: disables DNS prefetch to limit info leakage.
 */
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "https://*.supabase.co";
  try {
    return new URL(raw).origin;
  } catch {
    // Invalid or placeholder value during build — fall back to wildcard.
    return "https://*.supabase.co";
  }
})();

const wsSupabaseOrigin = supabaseOrigin.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for inline styles and 'unsafe-eval' in dev.
  // In production we drop 'unsafe-eval'. Google Fonts stylesheets are loaded from fonts.googleapis.com.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseOrigin} ${wsSupabaseOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  // Disable the "Powered by Next.js" header to reduce info disclosure (A05).
  poweredByHeader: false,

  // Enforce ESLint during builds to catch security-relevant issues early.
  eslint: {
    ignoreDuringBuilds: false,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
