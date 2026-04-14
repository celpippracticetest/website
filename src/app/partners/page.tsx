import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Partner program | CELPIP Practice Test",
  description:
    "Immigration consultants: earn 30% commission on your clients’ first subscription payment.",
};

export default async function PartnersLandingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <p className="text-sm font-medium text-orange-700">Partner program</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Refer clients. Earn on their first subscription.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Share your personal link ({`/?ref=your-code`}). There is no discount
          for the customer—they pay full price. You earn{" "}
          <strong>30% commission</strong> on their{" "}
          <strong>first successful payment</strong>, calculated from our records.
          Payouts are handled manually via e-transfer to the email you set in
          your dashboard.
        </p>

        <ul className="mt-8 list-inside list-disc space-y-2 text-slate-700">
          <li>Self-serve registration — we activate partners from our admin</li>
          <li>Track referred signups and commission totals in your dashboard</li>
          <li>Update your payout email anytime</li>
        </ul>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/partners/auth"
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-700"
          >
            Sign in or create account
          </Link>
          {userId ? (
            <Link
              href="/partners/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Open dashboard
            </Link>
          ) : null}
          <Link
            href="/"
            className="inline-flex items-center justify-center text-sm font-medium text-orange-700 underline-offset-4 hover:underline"
          >
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
