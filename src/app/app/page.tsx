'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Auth deep-link bridge for the mobile app.
 *
 * Supabase redirects here after verifying an email confirmation or OAuth
 * callback (e.g. celpippracticetest.com/app?code=XXXX&…).
 *
 * Chrome on Android blocks custom-scheme redirects that arrive via a
 * server-side redirect chain.  This page performs a direct JS navigation to
 * celpipapp://auth?… which *does* trigger the Android intent and opens the
 * app reliably.
 *
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   add  https://celpippracticetest.com/app
 */
export default function AppAuthBridgePage() {
  return (
    <Suspense fallback={<Screen title="Verifying…" />}>
      <Bridge />
    </Suspense>
  );
}

function Bridge() {
  const params = useSearchParams();
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (errorParam) {
      setError(errorDescription ?? errorParam);
      return;
    }

    // Forward every query parameter to the app unchanged.
    const appUrl = `celpipapp://auth?${params.toString()}`;

    // Direct JS navigation reliably fires an Android intent; server-side
    // redirect chains to celpipapp:// are silently dropped by Chrome 83+.
    window.location.href = appUrl;
    setLaunched(true);
  }, [params]);

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

  if (launched) {
    return (
      <Screen
        title="Opening CELPIP app…"
        hint={
          <>
            If the app did not open,{' '}
            <a
              href={`celpipapp://auth?${params.toString()}`}
              style={{ color: '#0070f3', textDecoration: 'underline' }}
            >
              tap here
            </a>
            .
          </>
        }
      />
    );
  }

  return <Screen title="Verifying…" />;
}

function Screen({
  title,
  body,
  hint,
  titleColor = '#111',
}: {
  title: string;
  body?: string;
  hint?: React.ReactNode;
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
      {hint && <p style={{ fontSize: '14px', color: '#666' }}>{hint}</p>}
    </main>
  );
}
