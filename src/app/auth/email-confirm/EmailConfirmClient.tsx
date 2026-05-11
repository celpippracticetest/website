"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Avoid double exchange in React Strict Mode (dev) and duplicate navigations. */
const exchangedCodes = new Set<string>();

function buildAppReturnHash(session: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  expires_at?: number;
}): string {
  const p = new URLSearchParams();
  p.set("access_token", session.access_token);
  p.set("refresh_token", session.refresh_token);
  p.set("expires_in", String(session.expires_in));
  p.set("token_type", session.token_type);
  if (session.expires_at != null) {
    p.set("expires_at", String(session.expires_at));
  }
  p.set("type", "signup");
  return p.toString();
}

export default function EmailConfirmClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState<string>("Confirming your email…");

  useEffect(() => {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    let cancelled = false;

    async function run() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setStatus("error");
        setMessage("Sign-in service is not configured on this site.");
        return;
      }

      if (code) {
        if (exchangedCodes.has(code)) {
          setStatus("done");
          setMessage("Your email is already confirmed. Open the app to continue.");
          return;
        }
        exchangedCodes.add(code);

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;

        if (error || !data.session) {
          exchangedCodes.delete(code);
          setStatus("error");
          setMessage(
            error?.message?.includes("verifier") || error?.message?.includes("code verifier")
              ? "This confirmation was started in the CELPIP app. On your phone, tap the link again so it opens the CELPIP app (not the website). If it keeps opening here, use “Resend confirmation” from the app."
              : (error?.message ??
                "This confirmation link is invalid or has expired. Use “Resend confirmation” in the app, or sign up again."),
          );
          return;
        }

        const deepLink = `celpipapp://auth#${buildAppReturnHash(data.session)}`;
        setStatus("done");
        setMessage("Opening the CELPIP app…");
        window.location.replace(deepLink);

        window.setTimeout(() => {
          if (!cancelled) {
            setMessage(
              "If the app did not open, tap “Open app” below or return to the app and sign in — your email is confirmed.",
            );
          }
        }, 2500);
        return;
      }

      if (tokenHash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: type as "signup" | "email" | "recovery" | "email_change",
          token_hash: tokenHash,
        });
        if (cancelled) return;

        if (error || !data.session) {
          setStatus("error");
          setMessage(
            error?.message ??
              "This confirmation link is invalid or has expired. Try signing up again in the app.",
          );
          return;
        }

        const deepLink = `celpipapp://auth#${buildAppReturnHash(data.session)}`;
        setStatus("done");
        setMessage("Opening the CELPIP app…");
        window.location.replace(deepLink);
        window.setTimeout(() => {
          if (!cancelled) {
            setMessage(
              "If the app did not open, open the CELPIP app manually — your email is confirmed.",
            );
          }
        }, 2500);
        return;
      }

      setStatus("error");
      setMessage("This page is missing a valid confirmation link. Open the link from your email again.");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">Email confirmation</h1>
      <p className="text-neutral-600">{message}</p>
      {status === "done" && (
        <p>
          <a
            href="celpipapp://auth"
            className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
          >
            Open app
          </a>
        </p>
      )}
      {status === "error" && (
        <p>
          <Link href="/" className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700">
            Back to home
          </Link>
        </p>
      )}
    </main>
  );
}
