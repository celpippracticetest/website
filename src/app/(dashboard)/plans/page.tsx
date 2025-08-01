import PlanCard from "@/components/pages/plans/PlanCard";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";

import React from "react";
import { planDetails } from "@/components/dashboard-new/Plans";

const Plans = async () => {
  const user = await currentUser();
  const userRepo = new CheckoutRepository(mongoClient);

  const prevCheckout = await userRepo.findLatestCheckoutByUserId(
    user?.id || ""
  );

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
          {planDetails.map((item, index) => (
            <PlanCard
              key={index}
              id={index}
              title={item.title}
              type={item.type}
              oldPrice={item.oldPrice}
              price={item.price}
              discount={item.discount}
              buttonTitle={item.buttonTitle}
              features={item.features}
              icon={item.icon}
              iconWrapperColor={item.iconWrapperColor}
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
