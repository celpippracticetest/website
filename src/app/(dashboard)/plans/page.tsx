import PlanCard from "@/components/pages/plans/PlanCard";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import documentsClient from "@/lib/appDocumentsClient";
import { PlansRepository } from "@/repositories/plans.repo";
import SvgBestValuePlan from "@/components/icons/BestValuePlan";
import SvgPopularPlan from "@/components/icons/PopularPlan";
import SvgFreePlan from "@/components/icons/FreePlan";

import React from "react";

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

  return (
    <>
      <section id="plans" className={"w-full"} aria-labelledby="plans-heading">
        <h2
          id="plans-heading"
          className="mt-[40px] screen744:!mt-[64px] screen1280:!mt-[40px] text-[24px] screen744:!text-[28px]  text-center flex justify-center text-neutral1 font-medium screen1280:!text-[32px]"
        >
          Choose Your Right Plan!
        </h2>

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
