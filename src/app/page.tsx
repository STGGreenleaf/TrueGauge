import type { Metadata } from 'next';
import LandingPage from './LandingPage';

// The homepage's own canonical. The apex redirects to www, so without this the pair competes with itself
// and any ?utm= variant competes with both.
//
// It lives HERE and not in the root layout on purpose: root metadata is inherited by all 14 routes, so a
// canonical up there would claim /privacy, /terms and every app route are this page.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  return <LandingPage />;
}
