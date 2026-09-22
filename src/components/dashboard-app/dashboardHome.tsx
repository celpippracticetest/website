"use client";

import React, { useEffect, useState } from "react";
import SvgSuccess from "../icons/Success";
import ArrowLeft from "../icons/ArrowLeft";
import { useRouter } from "next/navigation";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { readPracticePlanFromSupabaseUser } from "@/lib/auth/supabase-user-plan";

const DashboardHome = ({
  session,
  email,
}: {
  session: any;
  email: string | undefined | null;
}) => {
  const router = useRouter();
  const { reloadUser } = useHybridWebUser();
  const [planReady, setPlanReady] = useState(false);

  // After Stripe checkout, Auth app_metadata.plan is updated by the webhook (or
  // the success RSC), but the browser JWT can still say "free". Refresh until
  // Pro is visible so practice paywalls unlock without logout/login.
  useEffect(() => {
    let cancelled = false;

    async function syncPlanAfterCheckout() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setPlanReady(true);
        return;
      }

      for (let attempt = 0; attempt < 12 && !cancelled; attempt++) {
        await supabase.auth.refreshSession().catch(() => undefined);
        const { data } = await supabase.auth.getUser();
        const plan = data.user
          ? readPracticePlanFromSupabaseUser(data.user).plan
          : undefined;
        if (hasPaidPracticeAccess(plan)) {
          await reloadUser();
          if (!cancelled) setPlanReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 750));
      }

      await reloadUser();
      if (!cancelled) setPlanReady(true);
    }

    void syncPlanAfterCheckout();
    return () => {
      cancelled = true;
    };
  }, [reloadUser]);

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <main className="w-full flex flex-col  items-center   bg-[#F4F7FF] min-h-screen pt-[96px]">
      <div className="flex flex-col max-w-[456px] w-full items-center justify-center   ">
        <div className="flex flex-col items-center gap-[24px]">
          <SvgSuccess />
          <span className="text-[28px] font-medium text-[#212E42]">
            Payment Successful
          </span>
          {!planReady ? (
            <span className="text-[14px] text-[#76808F] font-normal text-center px-4">
              Activating your Pro access…
            </span>
          ) : null}
        </div>
        <div className="flex flex-col w-full max-w-[456px] gap-[24px] mt-[40px] px-[16px]">
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Payment type
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.payment_method_types?.[0] ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Mobile
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.customer_details?.phone ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Email
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.customer_email ?? email ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Amount paid
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {((session?.amount_total ?? 0) / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Transaction id
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.invoice ?? "-"}
            </span>
          </div>
        </div>
        <div
          onClick={() => {
            if (!planReady) return;
            router.push("/practice-overview");
          }}
          className={`flex pl-[16px] pr-[24px] mt-[40px] gap-[8px] justify-center items-center bg-[#4A7DFF] h-[40px] rounded-[24px] ${
            planReady ? "cursor-pointer" : "cursor-wait opacity-70"
          }`}
        >
          <span>
            <ArrowLeft className="text-white" />
          </span>
          <span className="text-[14px] text-white font-normal">
            {planReady ? "Back to dashboard" : "Activating Pro…"}
          </span>
        </div>
      </div>
    </main>
  );
};

export default DashboardHome;
