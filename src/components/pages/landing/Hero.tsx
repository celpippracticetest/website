import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import ExamSectionCard from "./ExamSectionCard";
import { motion } from "framer-motion";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";
import { useInView } from "react-intersection-observer";
import TopHeader from "./TopHeader";
import { Button } from "@/components/v2/Button";
import SvgMedalLg from "@/components/v2/icons/medal-lg";
import SvgMedalMd from "@/components/v2/icons/medal-md";

const SvgMockExamLight = dynamic(() => import("../../icons/MockExamsLight"), {
  ssr: false,
});
const SvgSampleTest = dynamic(() => import("../../icons/SampleTest"), {
  ssr: false,
});
const SvgGuide = dynamic(() => import("../../icons/Guide"), { ssr: false });
const SvgScoring = dynamic(() => import("../../icons/Scoring"), { ssr: false });
const SvgPlus = dynamic(() => import("../../icons/Plus"), { ssr: false });
const SvgListening = dynamic(() => import("../../icons/Listening"), {
  ssr: false,
});
const SvgSpeaking = dynamic(() => import("../../icons/Speaking"), {
  ssr: false,
});
const SvgWriting = dynamic(() => import("../../icons/Writing"), { ssr: false });
const SvgReading = dynamic(() => import("../../icons/Reading"), { ssr: false });
const SvgMockExamsColorful = dynamic(
  () => import("../../icons/MockExamsColorful"),
  { ssr: false }
);

const Hero = () => {
  const { ref } = useInView();
  const { setVisible, isVisible, isInFooter } = useButtonVisibleStore(
    (state) => state
  );

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;

      if (scrollY > 100 && !isInFooter) {
        setVisible(false);
      } else if (scrollY > 100 && isInFooter) {
        setVisible(false);
      } else if (scrollY < 100) {
        setVisible(false);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isInFooter]);

  useEffect(() => { }, [isInFooter]);

  useEffect(() => {
    if (window.location.hash === "#plans") {
      const el = document.getElementById("plans");

      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, []);

  return (
    <div ref={ref} className="flex flex-col ">
      <div
        className={`w-full  
    flex bg-[linear-gradient(180deg,_rgba(255,_255,_255,_0.4)_0%,_rgba(255,_255,_255,_0.8)_100%)] 
    backdrop-blur-[1px] 
    shadow-[0_0_100px_0px_rgba(255,255,255,0.8)] 
    ${isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-[12px] pointer-events-none"
          } 
    flex justify-center fixed z-[10] h-[128px] items-center 
    left-1/2 -translate-x-1/2 transition-all duration-500 
    ease-in-out transform bottom-0`}
      >
        <Button size="lg" href="/practice-overview" aria-label="Start your free CELPIP practice">
          <SvgPlus />
          <span className="hidden sm:!flex">Start Your Free Practice</span>
          <span className="flex sm:!hidden">Free Practice</span>
        </Button>
      </div>

      <section
        style={{
          background:
            "linear-gradient(-45deg, #CEDCFF70, #DAFFFA70, #FFB78A70, #CEDCFF70)",
          backgroundSize: "300% 300%",
          animation: "gradient 14s ease-in-out infinite",
        }}
        className="relative h-[430px] screen744:!h-[656px] screen1280:!h-[693px] pt-[80px] justify-center transition-all duration-300 w-full background-animate shadow-[inset_0px_-80px_96px_-4px_#F4F7FF]"
      >
        <TopHeader />
        <div className="flex max-w-[1440px] w-full justify-center mx-auto ">
          <div className="flex flex-col screen744:!flex-row w-full justify-between px-[16px] screen744:!px-[40px] flex-wrap screen744:!flex-nowrap">
            <div className="flex flex-col w-full">
              <div className="flex flex-col items-start screen744:!flex-row screen744:!gap-[10px] mt-[28px] screen1280:!mt-[108px] screen744:!items-center">
                <div className="mt-[16px] flex items-center h-[44px]">
                  <div className="items-center gap-[8px] mt-[24px] flex flex-row">
                    <SvgMedalLg className="hidden screen1280:!flex"/>
                    <SvgMedalMd className="flex screen1280:!hidden"/>
                    <span className="text-text2 font-normal screen1280:!text-[20px] text-[14px]">
                      <span className="text-primary2">#1 Top rated</span> CELPIP Resource 2025{" "}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-[21px] flex flex-row justify-between w-full screen1280:!mt-[38px] w-full h-[135px] screen1280:!h-[245px]">
                <h1 className="font-bold text-[32px] screen1280:!text-[65px] leading-[40px] screen1280:!leading-[70px] text-text1">
                  Reach Your Target<br />
                  <span className="text-primary2">CELPIP</span> Score.{" "}<br className="screen1280:!block hidden" />
                  <span className="text-secondary2 italic">Faster.</span>
                </h1>
                <div className="flex">
                  <div className="flex flex-col gap-[8px] screen744:!gap-[16px] screen744:!flex hidden w-[262px] h-[186px] screen744:!h-[224px]">
                    {[
                      {
                        title1: "60",
                        title2: "mock exams",
                        icon: <SvgMockExamLight />,
                      },
                      { title1: "", title2: "Guide & Tips", icon: <SvgGuide /> },
                      {
                        title1: "3,000+",
                        title2: "sample tests",
                        icon: <SvgSampleTest />,
                      },
                      {
                        title1: "",
                        title2: "AI-powered scoring",
                        icon: <SvgScoring />,
                      },
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.1 }}
                        className="flex gap-[8px] h-[44px] items-center"
                      >
                        <span>{item.icon}</span>
                        {item.title1 && (
                          <span className="text-text1 font-bold text-[20px] leading-[28px]">
                            {item.title1}
                          </span>
                        )}
                        <h3 className="text-text1 font-normal text-[20px] leading-[28px]">
                          {item.title2}
                        </h3>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.1 }}
                  >
                    <Image
                      src="/images/hero.png"
                      alt="Hero image of CELPIP preparation platform showing student success"
                      className="hidden screen1280:!flex w-[327px] h-[491px] relative top-[-120px]"
                      width={327}
                      height={491}
                      priority={true}
                      sizes="(max-width: 1280px) 0px, 327px"
                      quality={85}
                      loading="eager"
                      fetchPriority="high"
                    />
                  </motion.div>
                </div>
              </div>
                <Button href="/practice-overview" size="lg">
                  <SvgPlus />
                  <span>Start Your Free Practice</span>
                </Button>
                <div className="flex flex-row screen1280:!mt-[8px] mt-[14px]">
                  <Image
                    src="/images/people.png"
                    alt="People icon showing 20,000+ CELPIP graduates trusting CELPIPPRACTICETEST.com"
                    width={65}
                    height={28}
                    priority
                  />
                  <h2 className="text-text1 font-medium text-[14px] screen744:!text-[18px] leading-[28px] screen1280:!mt-[17px] mt-[13px]">
                    Trusted by 10k+ test-takers{" "}
                  </h2>
                </div>
            </div>
          </div>
        </div>
        <div className="hidden screen744:!flex left-0 right-0 screen1280:!mt-[52px] mt-[20px] px-[16px]">
          <div className="flex flex-wrap screen1280:flex-nowrap gap-[16px] screen1280:gap-[24px] w-full max-w-[1440px] mx-auto justify-center">
            {[
              {
                title: "Listening",
                icon: <SvgListening />,
                bgColor: "bg-primary5",
                link: "/listening",
              },
              {
                title: "Speaking",
                icon: <SvgSpeaking />,
                bgColor: "bg-secondary5",
                link: "/speaking",
              },
              {
                title: "Writing",
                icon: <SvgWriting />,
                bgColor: "bg-success5",
                link: "/writing",
              },
              {
                title: "Reading",
                icon: <SvgReading />,
                bgColor: "bg-error5",
                link: "/reading",
              },
              {
                title: "Mock Exams",
                icon: <SvgMockExamsColorful />,
                bgColor: "bg-purple5",
                link: "/exam-overview",
              },
            ].map((exam, index, array) => (
              <ExamSectionCard
                key={index}
                title={exam.title}
                icon={exam.icon}
                bgColor={exam.bgColor}
                isLast={index === array.length - 1}
                link={exam.link}
              />
            ))}
          </div>
        </div>
      </section>
      <div className="flex screen744:!hidden mt-[32px] px-[16px]">
        <div className="grid grid-cols-2 screen744:!flex flex-wrap screen1280:flex-nowrap gap-[16px] screen1280:gap-[24px] w-full max-w-[1440px] mx-auto justify-center">
          {[
            {
              title: "Listening",
              icon: <SvgListening />,
              bgColor: "bg-primary5",
              link: "/listening",
            },
            {
              title: "Speaking",
              icon: <SvgSpeaking />,
              bgColor: "bg-secondary5",
              link: "/speaking",
            },
            {
              title: "Writing",
              icon: <SvgWriting />,
              bgColor: "bg-success5",
              link: "/writing",
            },
            {
              title: "Reading",
              icon: <SvgReading />,
              bgColor: "bg-error5",
              link: "/reading",
            },
            {
              title: "Mock Exams",
              icon: <SvgMockExamsColorful />,
              bgColor: "bg-purple5",
              link: "/exam-overview",
            },
          ].map((exam, index, array) => (
            <ExamSectionCard
              key={index}
              title={exam.title}
              icon={exam.icon}
              bgColor={exam.bgColor}
              isLast={index === array.length - 1}
              link={exam.link}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
