import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

const SvgDiamond = dynamic(() => import("@/components/icons/Diamond"), {
  ssr: false,
});

const SvgOffer = dynamic(() => import("@/components/icons/Offer"), {
  ssr: false,
});
const SvgPerson = dynamic(() => import("@/components/icons/Person"), {
  ssr: false,
});

const AIReviewTest = dynamic(() => import("../segment/AIReviewTest"), {
  ssr: false,
});
const PracticeAndSubmit = dynamic(
  () => import("../segment/PracticeAndSubmit"),
  {
    ssr: false,
  }
);
const Improve = dynamic(() => import("../segment/Improve"), { ssr: false });
const MockTest = dynamic(() => import("../segment/MockTest"), { ssr: false });

const ReferralHeader = () => {
  const searchParams = useSearchParams();
  const firstName = searchParams.get("inviter");
  return (
    <div className="px-[16px] screen744:!px-[16px] screen1280:!px-[40px] ">
      <div className="pt-[24px]">
        <Link href={"/"}>
          <Image alt="logo" width={133} height={40} src="/images/logo.png" />{" "}
        </Link>
      </div>
      <div className="flex flex-col mt-[40px] screen1280:!mt-[64px] items-center  max-w-[692px] h-full min-h-[151px] mx-auto">
        <span className="font-semibold text-[32px] screen744:!text-[41px] screen1280:!text-[50px] ">
          Your friend {firstName} gave you{" "}
          <span className="text-error1"> 20% </span> Off!
        </span>

        <div className="flex mt-[24px] screen744:!mt-[32px] flex-col font-normal text-text2 text-left screen744:!text-center ">
          <span className="text-text2 text-[14px] screen744:!text-[20px] screen1280:!text-[24px]">
            {" "}
            Create a free account now to unlock your reward.{" "}
          </span>
          <span className="text-text2 text-[14px] screen744:!text-[20px] screen1280:!text-[24px]">
            No code needed. It’s automatically applied when you sign up.
          </span>
        </div>

        <a
          href={`/sign-up?ref=${searchParams.get(
            "ref"
          )}&inviter=${searchParams.get("inviter")}`}
          className="cursor-pointer screen1280:!mt-[50px] screen744:!mt-[40px] mt-[32px]  flex text-[14px] screen744:!text-[18px] font-semibold items-center justify-center   w-[231px] h-[40px] screen744:!h-[56px] bg-primary1 rounded-[24px] text-white"
        >
          Create Account
        </a>
      </div>

      <div className="screen1280:!px-[40px]">
        <div className="relative px-[20px] screen744:!px-[40px] screen1280:!px-0 screen1280:!pl-[80px] flex flex-col screen744:!flex-row items-start justify-center screen744:!justify-between flex-wrap  screen744:!flex-nowrap  border-[8px] mt-[118px] screen744:!mt-[95px] screen1280:!mt-[93px] h-[366px] screen744:!h-[219px] rounded-[24px] border-solid border-[#FFCAB5] bg-[radial-gradient(50%_265.62%_at_50%_50%,_#F26B3E_0%,_#FC8A65_100%)]">
          <div className="flex-shrink-1  max-w-[303px]  screen744:!max-w-[345px] screen1280:!max-w-fit h-[147px] screen744:!h-[46px] screen1280:!h-[100px] mt-[109px] screen744:!mt-[40px] screen1280:!mt-[59px] flex flex-col gap-[24px] screen1280:!gap-[32px]">
            <div className="font-semibold text-[24px] screen744:!text-[28px] screen1280:!text-[32px] text-white leading-[29px] screen1280:!leading-[100%]">
              You’ve Been Invited to CELPIPPRACTICETEST.com
            </div>
            <div className=" text-white text-[16px] screen1280:!text-[20px]  leading-[24px] screen1280:!leading-[100%]">
              Get <span className="text-[24px]">30% </span> off your first
              subscription and start your journey to CELPIP success.
            </div>
          </div>

          <Image
            src="/images/bear.png"
            alt="bear image"
            className="hidden screen744:!flex absolute right-0 left-0 mx-auto screen744:!mx-0 screen744:!static top-0w-[230px] h-[249px] screen744:!h-[345px] screen1280:!w-[269px] screen1280:!h-[404px] object-contain -mt-[125px] flex-shrink-0"
            width={269}
            height={404}
            loading="lazy"
          />
          <Image
            src="/images/bear_mobile.png"
            alt="bear image"
            className="flex screen744:!hidden absolute right-0 left-0 mx-auto screen744:!mx-0 screen744:!static top-0 w-[230px] h-[249px] screen744:!h-[345px] screen1280:!w-[269px] screen1280:!h-[404px] object-contain  -mt-[125px] flex-shrink-0"
            width={269}
            height={404}
            loading="lazy"
          />
        </div>
      </div>

      <div className="text-center mt-[40px] screen1280:!mt-[80px]">
        <span className=" font-semibold  text-[24px] screen744:!text-[28px] screen1280:!text-[32px] text-text1">
          What You’ll Unlock
        </span>
      </div>
      <div className="text-center mt-[40px] ">
        <span className=" font-normal text-[16px]  screen744:!text-[20px] text-text2">
          Practice smarter, not harder—with everything you need to succeed.
        </span>
      </div>

      <div className="relative flex flex-col overflow-hidden  screen744:!flex-row flex-wrap screen1280:flex-nowrap justify-between screen1280:!gap-[24px] mt-[40px] screen744:!mt-[45px] screen1280:!mt-[62px] bg-[#E1E9EC] border-outline border-solid rounded-[24px] border-[1px] h-[466px] screen744:!h-[300px]">
        <div className="flex-1 px-[24px] screen744:!px-[40px] pt-[24px] screen744:!pt-[72px] h-[100px] screen744:!h-auto">
          <div className=" font-semibold text-text1 text-[20px] screen744:!text-[24px]">
            Mock Exam
          </div>
          <div className="mt-[16px] screen744:!mt-[24px] text-text2 font-normal text-[14px] screen744:!text-[16px]">
            Timed, full-length test that simulates the real CELPIP exam with the
            most accurate scoring.
          </div>
          <div className="flex screen744:!hidden h-[1px] w-full bg-outline rounded-[24px] mt-[16px]"></div>
        </div>
        <div className="flex justify-center px-[16px] rotate-[17deg] origin-center absolute left-0 right-0 screen744:!static top-[200px] ">
          <div className=" max-w-[1160px]  w-[343px] h-[347px]  min-h-[557px] pt-[16px] px-[16px] bg-white rounded-[16px]">
            <div className="flex justify-between">
              <Image
                alt="beaver drink"
                width={48}
                height={72}
                src="/images/BeaverDrink.png"
              />
              <div className="flex gap-[8px] screen1280:!gap-[16px] items-center ">
                <div
                  className={`bg-purpule_light text-purple  h-[44px] px-[8px] py-[8px] rounded-[24px] flex items-center justify-center `}
                >
                  <span
                    className={`text-[14px] screen1280:!text-[18px] font-normal `}
                  >
                    Mock Exam
                  </span>
                </div>
                <div
                  className={`bg-primary6
                px-[8px] screen1280:!px-[16px]  py-[8px] rounded-[24px] h-[44px] text-primary2 flex items-center justify-center`}
                >
                  <span
                    className={`text-[14px] screen1280:!text-[18px] font-normal `}
                  >
                    Score
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-[8px]">
              <MockTest />
            </div>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden flex flex-col screen744:!flex-row flex-wrap screen1280:flex-nowrap justify-between screen1280:!gap-[24px] mt-[24px] bg-[#E1E9EC] border-outline border-solid rounded-[24px] border-[1px]  h-[466px] screen744:!h-[300px]">
        <div className="flex justify-center px-[16px] -rotate-[17deg] origin-center  absolute left-0 right-0 screen744:!static top-[180px]  ">
          <div className=" max-w-[1160px]  w-[343px] h-[547px]  min-h-[557px] pt-[16px] px-[16px] bg-white rounded-[16px]">
            <div className="flex justify-between">
              <Image
                alt="beaver drink"
                width={48}
                height={72}
                src="/images/BeaverDrink.png"
              />{" "}
              <div className="flex gap-[8px] screen1280:!gap-[16px] items-center ">
                <div
                  className={`bg-[#F0FFFD] text-[#0DAA94]  h-[44px] px-[8px] py-[8px] rounded-[24px] flex items-center justify-center `}
                >
                  <span className={`text-[14px] font-normal `}>
                    Submit Writing
                  </span>
                </div>
                <div
                  className={`bg-primary6
                px-[8px] screen1280:!px-[16px]  py-[8px] rounded-[24px] h-[44px] text-primary2 flex items-center justify-center`}
                >
                  <span className={`text-[14px]  font-normal `}>
                    AI Feedback
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-[8px]">
              <PracticeAndSubmit />,{" "}
            </div>
          </div>
        </div>
        <div className="flex-1 relative px-[24px] pt-[24px] screen744:!pt-[81px] screen1280:!pt-[90px]">
          <div className="font-semibold text-text1 text-[20px] screen744:!text-[24px]">
            Practice & Submit
          </div>
          <div className="mt-[24px] text-text2 font-normal text-[14px] screen744:!text-[16px]">
            Answer real questions and get instant results—perfect for writing
            improvement.
          </div>
          <div className="flex screen744:!hidden h-[1px]  bg-outline rounded-[24px] mt-[16px]"></div>
        </div>
      </div>
      <div className="relative flex overflow-hidden flex-col screen744:!flex-row flex-wrap screen1280:flex-nowrap justify-between screen1280:!gap-[24px] mt-[24px] bg-[#E1E9EC] border-outline border-solid rounded-[24px] border-[1px]  h-[466px] screen744:!h-[300px]">
        <div className="flex-1  px-[24px] pt-[24px] screen744:!pt-[72px]">
          <div className="font-semibold text-text1 text-[20px] screen744:!text-[24px]">
            AI Review
          </div>
          <div className="mt-[16px] screen744:!mt-[24px] text-text2 font-normal text-[14px] screen744:!text-[16px]">
            Receive real-time feedback on your speaking, including
            pronunciation, fluency, and vocabulary.
          </div>
          <div className="flex screen744:!hidden h-[1px]  bg-outline rounded-[24px] mt-[16px]"></div>
        </div>
        <div className="flex justify-center px-[16px] rotate-[17deg] origin-center absolute left-0 right-0 screen744:!static top-[200px]  ">
          <div className=" max-w-[1160px]  w-[343px] h-[463px]  min-h-[557px] pt-[16px] px-[16px] bg-white rounded-[16px]">
            <div className="flex justify-between">
              <Image
                alt="beaver drink"
                width={48}
                height={72}
                src="/images/BeaverDrink.png"
              />{" "}
              <div className="flex gap-[8px] screen1280:!gap-[16px] items-center ">
                <div
                  className={`bg-[#FFF7EE]  text-[#F4845F]  h-[44px] px-[8px] py-[8px] rounded-[24px] flex items-center justify-center `}
                >
                  <span
                    className={`text-[14px] screen1280:!text-[18px] font-normal `}
                  >
                    Speaking{" "}
                  </span>
                </div>
                <div
                  className={`bg-primary6
                px-[8px] screen1280:!px-[16px]  py-[8px] rounded-[24px] h-[44px] text-primary2 flex items-center justify-center`}
                >
                  <span
                    className={`text-[14px] screen1280:!text-[18px] font-normal `}
                  >
                    AI Feedback
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-[8px]">
              <AIReviewTest />{" "}
            </div>
          </div>
        </div>
      </div>
      <div className="relative flex overflow-hidden flex-col screen744:!flex-row flex-wrap screen1280:flex-nowrap justify-between screen1280:!gap-[24px] mt-[24px] bg-[#E1E9EC] border-outline border-solid rounded-[24px] border-[1px]  h-[466px] screen744:!h-[300px]">
        <div className="flex justify-center px-[16px] -rotate-[17deg] origin-center absolute left-0 right-0 screen744:!static top-[184px] ">
          <div className=" max-w-[1160px]  w-[343px] h-[463px]  min-h-[557px] pt-[16px] px-[16px] bg-white rounded-[16px]">
            <div className="flex justify-between">
              <Image
                alt="beaver drink"
                width={48}
                height={72}
                src="/images/BeaverDrink.png"
              />{" "}
              <div className="flex gap-[8px] screen1280:!gap-[16px] items-center ">
                <div
                  className={`bg-[#FFF7EE]  text-[#F4845F]  h-[44px] px-[8px] py-[8px] rounded-[24px] flex items-center justify-center `}
                >
                  <span
                    className={`text-[14px] screen1280:!text-[18px] font-normal `}
                  >
                    Speaking{" "}
                  </span>
                </div>
                <div
                  className={`bg-primary6
                px-[8px] screen1280:!px-[16px]  py-[8px] rounded-[24px] h-[44px] text-primary2 flex items-center justify-center`}
                >
                  <span
                    className={`text-[14px] screen1280:!text-[18px] font-normal `}
                  >
                    AI Feedback
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-[8px]">
              <Improve />,
            </div>
          </div>
        </div>
        <div className="flex-1 relative  px-[24px] pt-[63px] screen744:!pt-[108px] screen1280:!pt-[110px]">
          <div className="font-semibold text-text1 text-[20px] screen744:!text-[24px]">
            Improve
          </div>
          <div className="mt-[16px] screen1280:!mt-[24px] text-text2 font-normal text-[14px] screen744:!text-[16px]">
            See what to fix and how to fix it, with detailed writing analysis
            and grammar insights.
          </div>
          <div className="screen1280:!static absolute z-[10] left-0 right-0  top-[178px] flex screen744:!hidden h-[1px] mx-[24px]  bg-outline rounded-[24px] mt-[16px]"></div>
        </div>
      </div>
      <div className="text-center mt-[40px] screen1280:!mt-[80px]">
        <span className=" font-semibold text-[28px]  screen1280:!text-[32px] text-text2">
          How It Works
        </span>
      </div>
      <div className="flex mt-[40px] flex-wrap screen1280:flex-nowrap gap-[24px] w-full max-w-[1440px] mx-auto justify-center">
        {[
          {
            title: "Accept the Offer",
            description:
              "Click the link and land here with your 30% discount auto-applied.",
            icon: <SvgDiamond />,
            bgColor: "bg-[#FAE0FF]",
          },
          {
            title: "Register",
            description: "Create your free account in under a minute.",
            icon: <SvgPerson />,
            bgColor: "bg-[#FFEBD6]",
          },
          {
            title: "Purchase a Plan",
            description: "Choose any paid plan and get 30% off instantly.",
            icon: <SvgOffer />,
            bgColor: "bg-[#D1DEFF]",
          },
        ].map((element, index) => (
          <div
            key={index}
            className="relative flex rounded-[24px]  bg-white w-full screen1280:!w-[437px] h-[264px] screen744:!h-[242px] flex-col screen744:!px-[16px] screen1280:!px-[40px] before:absolute before:rounded-[24px] hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 before:ease before:content-[''] before:inset-0 before:transform before:translate-z-[-1px] "
          >
            <article className="relative z-[1] h-full">
              {" "}
              <div className="flex justify-center mt-[24px] ">
                <div
                  className={`flex justify-center items-center ${element.bgColor} h-[48px] w-[48px] rounded-[8px]`}
                >
                  {element.icon}
                </div>
              </div>
              <div className=" mt-[24px] items-center screen1280:!items-start flex flex-col h-[122px]">
                <span className="text-text2 text-[18px] font-meidum h-[22px]">
                  Step{index + 1}
                </span>
                <span className="mt-[16px] h-[24px] text-text2 text-[20px] font-semibold">
                  {element.title}
                </span>
                <span className="mt-[16px] px-[40px] screen1280:!px-0 text-center screen744:!text-left text-text2 text-[18px] font-normal h-[44px] leading-[21px]">
                  {element.description}
                </span>
              </div>
            </article>
          </div>
        ))}
      </div>

      <a
        href={`https://accounts.celpippracticetest.com/sign-up`}
        target="_blank"
        className="flex  mt-[64px] justify-center  mx-auto"
      >
        <div className="cursor-pointer flex text-[18px] font-semibold items-center justify-center mt-[50px] w-[318px] h-[56px] bg-primary1 rounded-[24px] text-white">
          Create Your Free Account{" "}
        </div>
      </a>
      <div className="text-center mt-[40px] screen744:!mt-[64px] screen1280:!mt-[80px]">
        <span className=" font-semibold  text-[32px] text-text1">FAQs</span>
      </div>
    </div>
  );
};

export default ReferralHeader;
