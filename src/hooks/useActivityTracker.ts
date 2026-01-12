'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function useActivityTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    // Generate session ID on mount
    if (!sessionId.current) {
      sessionId.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  useEffect(() => {
    // Don't track the same path twice in a row
    if (pathname === lastTrackedPath.current) return;
    
    // Don't track owner-only pages or API routes
    if (pathname.startsWith('/owner') || pathname.startsWith('/api')) return;
    
    // Don't track auth pages
    if (pathname.startsWith('/auth') || pathname === '/splash') return;

    const trackPageView = async () => {
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'page_view',
            page: pathname,
            metadata: { sessionId: sessionId.current },
          }),
        });
        lastTrackedPath.current = pathname;
      } catch {
        // Silently fail - don't break the app for tracking
      }
    };

    trackPageView();
  }, [pathname]);
}

// Track specific actions (button clicks, form submissions, etc.)
export async function trackAction(action: string, metadata?: Record<string, unknown>) {
  try {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, metadata }),
    });
  } catch {
    // Silently fail
  }
}
