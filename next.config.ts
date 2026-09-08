import type { NextConfig } from "next";

// Everything behind the login. These inherit `robots: { index: true }` from the root layout, and being
// absent from the sitemap is not the same as telling a crawler to stay out — anything that finds one by
// a link or a leaked URL is currently invited to index it.
//
// Set as a header rather than as metadata in ten files: it covers every response under the path, applies
// to non-HTML too, and a route added next month inherits the right answer without anyone remembering.
const PRIVATE_ROUTES = [
  '/dashboard', '/annual', '/calendar', '/diary', '/manual',
  '/owner-portal', '/owner/brand', '/settings', '/vendors', '/login',
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return PRIVATE_ROUTES.map((source) => ({
      source: `${source}/:path*`,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    })).concat(
      PRIVATE_ROUTES.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    );
  },
};

export default nextConfig;
