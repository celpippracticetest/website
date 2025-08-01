import React from "react";
import PlanCard from "./PlanCard";
import { planDetailsLanding } from "@/components/dashboard-new/PlansLanding";

const Plan = () => {
  return (
    <>
      <section
        id="plans"
        className="mb-[104px]"
        aria-labelledby="plans-heading"
      >
        <h2
          id="plans-heading"
          className="mt-[40px] screen744:!mt-[80px] screen1280:!mt-[104px] text-[24px] screen744:!text-[28px] flex justify-center text-neutral1 font-medium screen1280:!text-[32px]"
        >
          Choose Your Right Plan!
        </h2>

        <div className=" mt-[40px] flex-col-reverse screen1280:!flex-row screen1280:!mt-[80px] px-[24px]  screen1280:!px-[40px] gap-[24px] flex flex-wrap screen1280:!flex-nowrap justify-center ">
          {planDetailsLanding.map((item, index) => (
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
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default Plan;
