import { SignOutButton } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account access | CELPIP Practice Test",
  robots: { index: false, follow: false },
};

export default function AccountSharingNoticePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900">
          Subscription access limited
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          We detected sign-in activity that usually means a subscription is being
          shared across different people or regions. Paid plans are for individual
          use. Sign out and use the site from one primary location, or contact
          support if you believe this is a mistake.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign out
            </button>
          </SignOutButton>
          <a
            href="mailto:support@celpippracticetest.com"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
