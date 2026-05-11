import type { Metadata } from "next";
import { Suspense } from "react";
import EmailConfirmClient from "./EmailConfirmClient";

export const metadata: Metadata = {
  title: "Confirm email",
  robots: { index: false, follow: false },
};

function EmailConfirmFallback() {
  return (
    <main className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center px-6 py-16 text-center text-neutral-600">
      Loading confirmation…
    </main>
  );
}

export default function EmailConfirmPage() {
  return (
    <Suspense fallback={<EmailConfirmFallback />}>
      <EmailConfirmClient />
    </Suspense>
  );
}
