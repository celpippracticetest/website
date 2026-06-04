import React, { useState, useRef, useEffect } from "react";

import dynamic from "next/dynamic";
import Image from "next/image";

const PracticeAndSubmit = dynamic(() => import("./segment/PracticeAndSubmit"), {
  ssr: false,
});

const MockTest = dynamic(() => import("./segment/MockTest"), {
  ssr: false,
});

const AIReviewTest = dynamic(() => import("./segment/AIReviewTest"), {
  ssr: false,
});

const Improve = dynamic(() => import("./segment/Improve"), { ssr: false });

const UserResponseReview = () => {
  const [active, setActive] = useState(0);
  const tabs = [
    {
      type: "mock",
      title: "Mock Test",
      response: {
        header: {
          title1: "Score",
          title2: "Mock Exam",
        },
        body: {
          title: "CELPIP Score Result",
          subtitle:
            "Get Feedback and estimated CELPIP scores for your writing and speaking practices in real time, based on formal assessment criteria.",
          size: 255,
          component: <MockTest />,
        },
      },
    },

    {
      type: "practice",
      title: "Practice & Submit",
      response: {
        header: {
          title1: "AI Feedback",
          title2: "Submit Writing",
        },
        body: {
          title: "Answer Insight",
          subtitle:
            "We will review your response, point out any mistakes, and suggest a better way to improve your answer.",
          size: 320,
          component: <PracticeAndSubmit />,
        },
      },
    },
    {
      type: "review",
      title: "AI Review",
      response: {
        header: {
          title1: "AI Feedback",
          title2: "Speaking",
        },
        body: {
          title: "Train Like ItΓÇÖs the Real CELPIP Exam",
          subtitle:
            "Learn to be a CELPIP test master by practicing with actual exam-pattern questionsA Peaceful Countryside RoadWhat can you see in the picture below? Describe it as best as you can. The person you are talking to can't see the picture.",
          size: 306,
          component: <AIReviewTest />,
        },
      },
    },
    {
      type: "improve",
      title: "Real Exam Format",
      response: {
        header: {
          title1: "AI Feedback",
          title2: "Speaking",
        },
        body: {
          title: "Train Like ItΓÇÖs the Real CELPIP Exam",
          subtitle:
            "Practice Like It's the Real CELPIP Test. Excel at the CELPIP test with real exam-style questions to practice.",
          size: 375,
          component: <Improve />,
        },
      },
    },
  ];

  const tabRefs = useRef<HTMLDivElement[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const currentTab = tabRefs.current[active];
    if (currentTab && tabRefs.current) {
      setIndicatorStyle({
        left: currentTab.offsetLeft,
        width: currentTab.offsetWidth,
      });
    }
  }, [active]);

  const color: Record<
    "mock" | "practice" | "review" | "improve",
    { bg: string; text: string }
  > = {
    mock: {
      bg: "bg-purpule_light",
      text: "text-purple",
    },
    practice: {
      bg: "bg-success_light",
      text: "text-success",
    },
    review: {
      bg: "bg-secondary6",
      text: "text-secondary2",
    },
    improve: {
      bg: "bg-secondary6",
      text: "text-secondary2",
    },
  };

  const tabType = tabs[active].type as keyof typeof color;
  return (
    <div className="mt-[40px] screen744:!mt-[125px] screen1280:!mt-[156px] flex-col flex  max-w-[1440px] mx-auto justify-center w-full">
      <span className="text-center text-text1 font-500 text-[24px] screen744:!text-[28px] screen1280:!text-[32px]">
        Get Real-Time Insights on Your Responses
      </span>

      <div className="overflow-x-auto scrollbar-none px-[16px]">
        <div className="relative mt-[40px] flex gap-[10px] w-max flex-nowrap border-[1px] rounded-[32px] mx-auto justify-start border-solid p-[12px] border-primary5 bg-[linear-gradient(90deg,_rgba(255,_255,_255,_0.65)_0%,_rgba(255,_255,_255,_0.25)_100%)]">
          <div
            className="absolute w-[191px] screen1280:!w-[276px] top-[12px] h-[40px] rounded-[16px] bg-primary2 z-0 transition-all duration-300 pointer-events-none"
            style={{
              left: `${indicatorStyle.left}px`,
            }}
          />
          {tabs?.map((tab, index) => (
            <div
              key={index}
              className="relative flex-shrink-0"
              ref={(el) => {
                if (el) tabRefs.current[index] = el;
              }}
            >
              <div
                onClick={() => setActive(index)}
                className={`${active === index ? "bg-primary2 text-white" : "text-text2"
                  } flex items-center hover:cursor-pointer justify-center hover:text-white hover:bg-primary2 text-[18px] h-[40px] w-[191px] screen1280:!w-[276px] rounded-[16px] transition-colors duration-300 z-[10] flex-shrink-0`}
              >
                {tab.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center px-[16px] ">
        <div className="mt-[40px] max-w-[1160px]  w-full h-auto pb-[29px] min-h-[557px] pt-[16px] px-[24px] bg-white rounded-[16px]">
          <div className="flex justify-between">
            {active == 0 ? (
              <Image
                alt="beaver mock test"
                width={72}
                height={72}
                src="/images/BeaverMockTest.png"
              />
            ) : active == 1 ? (
              <Image
                alt="beaver practice"
                width={72}
                height={72}
                src="/images/BeaverPractice.png"
              />
            ) : active == 2 ? (
              <Image
                alt="beaver ai review"
                width={72}
                height={72}
                src="/images/BeaverAiReview.png"
              />
            ) : active == 3 ? (
              <Image
                alt="beaver drink"
                width={72}
                height={72}
                src="/images/BeaverDrink.png"
              />
            ) : (
              <></>
            )}
            <div className="flex gap-[8px] screen1280:!gap-[16px] items-center">
              <div
                className={`${color[tabType].bg} ${color[tabType].text}  h-[44px] px-[8px] screen1280:!px-[16px] py-[8px] rounded-[24px] flex items-center justify-center `}
              >
                <span
                  className={`text-[14px] screen1280:!text-[18px] font-normal `}
                >
                  {tabs[active].response.header.title2}
                </span>
              </div>
              <div
                className={`bg-primary6
                 px-[8px] screen1280:!px-[16px]  py-[8px] rounded-[24px] h-[44px] text-primary2 flex items-center justify-center`}
              >
                <span
                  className={`text-[14px] screen1280:!text-[18px] font-normal `}
                >
                  {tabs[active].response.header.title1}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mt-[12px] screen744:!mt-[16px] h-[28px]  ">
              <span className="text-text1 font-semibold text-[16px] screen744:!text-[18px] screen1280:!text-[30px]">
                {tabs[active].response.body.title}
              </span>
            </div>
            <div className="mt-[12px] screen744:!mt-[16px]">
              <span className="text-text2 font-normal text-[12px] screen744:!text-[18px]">
                {tabs[active].response.body.subtitle}
              </span>
            </div>
          </div>

          <div className="mt-[12px] screen744:!mt-[16px] ">
            {tabs[active].response.body.component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserResponseReview;
