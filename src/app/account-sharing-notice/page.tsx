import type { Metadata } from "next";
import { Suspense } from "react";
import AccountSharingNoticeClient from "./AccountSharingNoticeClient";

export const metadata: Metadata = {
  title: "Account access | CELPIP Practice Test",
  robots: { index: false, follow: false },
};

function AccountSharingNoticeFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900">Subscription access limited</h1>
        <p className="mt-4 text-base text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function AccountSharingNoticePage() {
  return (
    <Suspense fallback={<AccountSharingNoticeFallback />}>
      <AccountSharingNoticeClient />
    </Suspense>
  );
}
