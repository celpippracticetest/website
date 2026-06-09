import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/referral");

import { Suspense } from "react";
import dynamic from "next/dynamic";

const ReferralPageClient = dynamic(
  () => import("@/components/pages/referral/Referral"),
  {
    ssr: true,
  }
);

export default function ReferralPage() {
  return (
    <Suspense fallback={null}>
      <ReferralPageClient />
    </Suspense>
  );
}
