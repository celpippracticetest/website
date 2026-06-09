import { Suspense } from "react";
import UpdatePasswordClient from "./UpdatePasswordClient";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/auth/update-password");

function UpdatePasswordFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-sm text-slate-600">Loading…</p>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<UpdatePasswordFallback />}>
      <UpdatePasswordClient />
    </Suspense>
  );
}
