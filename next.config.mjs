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

  // pdf-parse uses Node.js `fs` internally (loads a test file on import).
  // Marking it as external prevents Next.js from bundling it, which fixes
  // "failed to parse PDF file" errors in API routes.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },

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

  async redirects() {
    return [
      { source: '/renata/workspace', destination: '/renata/mission-control', permanent: true },
      { source: '/renata/gatehouse', destination: '/renata/mission-control', permanent: true },
      { source: '/renata/reveal/:featureId', destination: '/renata/insights/:featureId', permanent: true },
      { source: '/renata/scroll', destination: '/renata/results', permanent: true },
      { source: '/renata/silent-laws', destination: '/renata/results', permanent: true },
      { source: '/renata/flow', destination: '/renata/results', permanent: true },
      { source: '/renata/tome', destination: '/renata/results', permanent: true },
      { source: '/renata/realms', destination: '/renata/results', permanent: true },
      { source: '/renata/trials', destination: '/renata/results', permanent: true },
      { source: '/renata/grand-map', destination: '/renata/results', permanent: true },
      { source: '/renata/counsel', destination: '/renata/results', permanent: true },
      { source: '/renata/codex', destination: '/renata/results', permanent: true },
      { source: '/renata/catalog', destination: '/renata/results', permanent: true },
      { source: '/renata/requirements', destination: '/renata/results', permanent: true },
      { source: '/renata/non-functional', destination: '/renata/results', permanent: true },
      { source: '/renata/process', destination: '/renata/results', permanent: true },
      { source: '/renata/features', destination: '/renata/results', permanent: true },
      { source: '/renata/systems', destination: '/renata/results', permanent: true },
      { source: '/renata/risks', destination: '/renata/results', permanent: true },
      { source: '/renata/architecture', destination: '/renata/results', permanent: true },
      { source: '/renata/advisory', destination: '/renata/results', permanent: true },
      { source: '/oracle', destination: '/renata/mission-control', permanent: true },
      { source: '/oracle/:path*', destination: '/renata/mission-control', permanent: true },
    ];
  },

  // Proxy /api/brd/* requests to Railway for long-running analysis operations.
  // Railway supports 300s timeouts vs Vercel Hobby's 10s limit.
  // Set RAILWAY_API_URL env var to your Railway deployment URL (e.g. https://your-app.up.railway.app)
  async rewrites() {
    const railwayUrl = process.env.RAILWAY_API_URL;
    if (!railwayUrl || !/^https?:\/\//.test(railwayUrl)) return [];

    return [
      {
        source: '/api/brd/extract',
        destination: `${railwayUrl}/api/brd/extract`,
      },
      {
        source: '/api/brd/core',
        destination: `${railwayUrl}/api/brd/core`,
      },
      {
        source: '/api/brd/advisory',
        destination: `${railwayUrl}/api/brd/advisory`,
      },
      {
        source: '/api/brd/enrich',
        destination: `${railwayUrl}/api/brd/enrich`,
      },
    ];
  },
};

export default nextConfig;
