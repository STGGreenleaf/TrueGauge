'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-3M34WR1NEE';

export function GoogleAnalytics() {
  return (
    <>
      {/* Silence Vercel instrumentation deprecation warnings */}
      <Script id="console-filter" strategy="beforeInteractive">
        {`
          (function() {
            const originalWarn = console.warn;
            console.warn = function(...args) {
              if (args[0] && typeof args[0] === 'string' && args[0].includes('[DEPRECATED]')) return;
              originalWarn.apply(console, args);
            };
          })();
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
