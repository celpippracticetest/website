'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const APP_PACKAGE = 'com.celpippt.app';

/**
 * Auth deep-link bridge for the mobile app.
 *
 * Supabase redirects to /app?code=XXXX after verifying an email confirmation.
 *
 * On Android, Chrome blocks `window.location.href = 'celpipapp://...'` when
 * triggered from a useEffect without a user gesture originating from the same
 * page.  We use the Android Intent URL format instead
 * (intent://…#Intent;scheme=celpipapp;package=…;end) which Chrome handles
 * natively and does not require an explicit user gesture.
 * A visible "Open app" button is always shown as a guaranteed fallback.
 */
export function AppAuthBridge() {
  return (
    <Suspense fallback={<Screen title="Verifying…" />}>
      <Bridge />
    </Suspense>
  );
}

/** Converts the query-string params to an Android Intent URL for Chrome. */
function toIntentUrl(queryString: string): string {
  // intent://auth?<params>#Intent;scheme=celpipapp;package=com.celpippt.app;end
  return `intent://auth?${queryString}#Intent;scheme=celpipapp;package=${APP_PACKAGE};end`;
}

/** Plain custom-scheme URL for non-Chrome browsers (iOS Safari, Firefox, etc.). */
function toAppUrl(queryString: string): string {
  return `celpipapp://auth?${queryString}`;
}

function Bridge() {
  const params = useSearchParams();
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qs = params.toString();

  useEffect(() => {
    const errorParam = params.get('error');
    if (errorParam) {
      setError(params.get('error_description') ?? errorParam);
      return;
    }
    if (!qs) return;

    // Android Intent URL: Chrome opens the app directly without gesture check.
    const isAndroid = /android/i.test(navigator.userAgent);
    const target = isAndroid ? toIntentUrl(qs) : toAppUrl(qs);
    window.location.href = target;
    setTried(true);
  }, [qs, params]);

  if (error) {
    return (
      <Screen
        title="Confirmation failed"
        body={error}
        hint="You can close this tab and try again."
        titleColor="#c0392b"
      />
    );
  }

  return (
    <Screen
      title={tried ? 'Opening CELPIP app…' : 'Verifying…'}
      hint={
        qs ? (
          <span>
            App did not open?{' '}
            <a href={toAppUrl(qs)} style={{ color: '#0070f3', fontWeight: 600 }}>
              Tap here to open
            </a>
          </span>
        ) : undefined
      }
      cta={
        qs ? (
          <a
            href={toIntentUrl(qs)}
            style={{
              display: 'inline-block',
              marginTop: '20px',
              padding: '14px 32px',
              background: '#0070f3',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Open CELPIP App
          </a>
        ) : undefined
      }
    />
  );
}

function Screen({
  title,
  body,
  hint,
  cta,
  titleColor = '#111',
}: {
  title: string;
  body?: string;
  hint?: React.ReactNode;
  cta?: React.ReactNode;
  titleColor?: string;
}) {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
        textAlign: 'center',
        background: '#f9f9f9',
      }}
    >
      <p style={{ fontSize: '20px', fontWeight: 600, color: titleColor, marginBottom: '8px' }}>
        {title}
      </p>
      {body && (
        <p style={{ fontSize: '15px', color: '#333', marginBottom: '12px' }}>{body}</p>
      )}
      {cta}
      {hint && (
        <p style={{ fontSize: '13px', color: '#888', marginTop: '16px' }}>{hint}</p>
      )}
    </main>
  );
}
