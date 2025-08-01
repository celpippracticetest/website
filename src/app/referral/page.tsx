export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
