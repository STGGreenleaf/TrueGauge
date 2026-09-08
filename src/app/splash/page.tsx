import type { Metadata } from 'next';
import SplashClient from './SplashClient';

export const metadata: Metadata = {
  alternates: { canonical: '/splash' },
};

export default function Page() {
  return <SplashClient />;
}
