import PlanCard from "@/components/pages/plans/PlanCard";
import PlansPageTracking from "@/components/analytics/PlansPageTracking";
import { JsonLd } from "@/components/seo/JsonLd";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import documentsClient from "@/lib/appDocumentsClient";
import { PlansRepository } from "@/repositories/plans.repo";
import SvgBestValuePlan from "@/components/icons/BestValuePlan";
import SvgPopularPlan from "@/components/icons/PopularPlan";
import SvgFreePlan from "@/components/icons/FreePlan";

import React from "react";
import { getSubscriptionDisplayName, hasPremiumPlusAccess } from "@/lib/subscriptionAccess";

const getIconComponent = (iconType?: string) => {
  switch (iconType) {
    case "BestValuePlan":
      return <SvgBestValuePlan />;
    case "PopularPlan":
      return <SvgPopularPlan />;
    case "FreePlan":
      return <SvgFreePlan />;
    default:
      return <SvgFreePlan />;
  }
};

const Plans = async () => {
  const hybridUser = await getHybridCurrentUser();
  const user = hybridUser?.user ?? null;
  const db = await documentsClient.db();
  const userRepo = new CheckoutRepository(documentsClient);
  const plansRepo = new PlansRepository(db);

  const [prevCheckout, plans] = await Promise.all([
    userRepo.findLatestCheckoutByUserId(user?.id || ""),
    plansRepo.getActivePlans(),
  ]);

  const currentPlanTitle = prevCheckout?.lineItems?.[0]?.description || "";
  const currentPlanDisplayName = getSubscriptionDisplayName(
    user?.publicMetadata?.plan as string | undefined,
    user?.publicMetadata?.purchaseDate as string | undefined,
    currentPlanTitle || null
  );
  const isPremiumPlusUser = hasPremiumPlusAccess(
    user?.publicMetadata?.plan as string | undefined,
    user?.publicMetadata?.purchaseDate as string | undefined
  );

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": plans.map((plan, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Course",
        "name": plan.planTitle || plan.title,
        "description": plan.features?.join(". ") || "CELPIP Practice Plan",
        "provider": {
          "@type": "Organization",
          "name": "CELPIP Practice Test",
          "sameAs": "https://celpippracticetest.com"
        },
        "offers": {
          "@type": "Offer",
          "price": plan.price?.toString().replace(/[^0-9.]/g, "") || "0",
          "priceCurrency": "CAD"
        }
      }
    }))
  };

  return (
    <>
      <JsonLd data={schemaData} />
      <PlansPageTracking plans={plans} />
      <section id="plans" className={"w-full"} aria-labelledby="plans-heading">
        <h2
          id="plans-heading"
          className="mt-[40px] screen744:!mt-[64px] screen1280:!mt-[40px] text-[24px] screen744:!text-[28px]  text-center flex justify-center text-neutral1 font-medium screen1280:!text-[32px]"
        >
          Choose Your Right Plan!
        </h2>

        {user?.publicMetadata?.plan && currentPlanDisplayName !== "Free" && (
          <div className="mx-auto mt-[20px] max-w-[680px] rounded-[20px] border border-[#D9E5FF] bg-[#F7FAFF] px-[20px] py-[16px] text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4A7DFF]">
              Your Access
            </p>
            <p className="mt-[4px] text-[18px] font-semibold text-[#212E42]">
              {currentPlanDisplayName}
            </p>
            {isPremiumPlusUser && (
              <p className="mt-[4px] text-[14px] text-[#5B6472]">
                You currently have full-site access, including mock exams.
              </p>
            )}
          </div>
        )}

        <div className="mt-[40px]  px-[24px]  gap-[24px] flex flex-wrap screen1280:!flex-nowrap  screen1280:!flex-row justify-center ">
          {plans.map((item, index) => (
            <PlanCard
              key={item._id?.toString() || index}
              id={index}
              title={item.title}
              type={item.type}
              oldPrice={item.oldPrice}
              price={item.price}
              discount={item.discount}
              buttonTitle={item.buttonTitle}
              features={item.features}
              stripePriceId={item.stripePriceId}
              icon={getIconComponent(item.iconType)}
              iconWrapperColor={item.iconWrapperColor || "bg-purple5"}
              currentPlanTitle={currentPlanTitle}
              planTitle={item.planTitle}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default Plans;
