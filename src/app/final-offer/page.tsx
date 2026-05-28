import { Suspense } from "react";
import FinalOfferPageClient from "./FinalOfferPageClient";

function FinalOfferFallback() {
  return (
    <div className="min-h-screen bg-[#F6F9FF] px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-orange-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-600">Loading your personalized offer...</p>
      </div>
    </div>
  );
}

export default function FinalOfferPage() {
  return (
    <Suspense fallback={<FinalOfferFallback />}>
      <FinalOfferPageClient />
    </Suspense>
  );
}
