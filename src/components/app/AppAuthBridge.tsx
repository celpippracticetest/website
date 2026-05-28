'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/v2/Button';
import { cn } from '@/lib/utils';

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
        variant="error"
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
            <a href={toAppUrl(qs)} className="font-semibold text-primary1 underline-offset-2 hover:underline">
              Tap here to open
            </a>
          </span>
        ) : undefined
      }
      cta={
        qs ? (
          <Button
            href={toIntentUrl(qs)}
            variant="primary"
            size="lg"
            className="mt-5 w-full max-w-xs px-8 screen744:w-auto"
          >
            Open CELPIP App
          </Button>
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
  variant = 'default',
}: {
  title: string;
  body?: string;
  hint?: React.ReactNode;
  cta?: React.ReactNode;
  variant?: 'default' | 'error';
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center screen744:min-h-[50vh]">
      <div className="w-full max-w-md rounded-3xl border border-outline/80 bg-white px-6 py-8 shadow-sm screen744:px-8 screen744:py-10">
        <p
          className={cn(
            'text-xl font-semibold screen744:text-2xl',
            variant === 'error' ? 'text-error1' : 'text-text1',
          )}
        >
          {title}
        </p>
        {body ? (
          <p className="mt-3 text-base leading-relaxed text-text2">{body}</p>
        ) : null}
        {cta}
        {hint ? (
          <p className="mt-4 text-sm text-text3">{hint}</p>
        ) : null}
      </div>
    </main>
  );
}
