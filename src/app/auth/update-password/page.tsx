import { Suspense } from "react";
import UpdatePasswordClient from "./UpdatePasswordClient";

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
