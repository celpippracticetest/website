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
import { SvgLearning } from "@/components/icons";
import SvgWord from "@/components/icons/Word";
import { cn } from "@/lib/utils";

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
  { ssr: false },
);

const Hero = () => {
  const { ref } = useInView();
  const { setVisible, isVisible, isInFooter } = useButtonVisibleStore(
    (state) => state,
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

  useEffect(() => {}, [isInFooter]);

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
    ${
      isVisible
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-[12px] pointer-events-none"
    } 
    flex justify-center fixed z-[10] h-[128px] items-center 
    left-1/2 -translate-x-1/2 transition-all duration-500 
    ease-in-out transform bottom-0`}
      >
        <Button
          size="lg"
          href="/practice-overview"
          aria-label="Start your free CELPIP practice"
        >
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
        className="relative pt-[80px] flex flex-col min-h-screen screen1024:min-h-[100dvh] justify-between transition-all duration-300 w-full background-animate shadow-[inset_0px_-80px_96px_-4px_#F4F7FF]"
      >
        <TopHeader />
        <div className="flex max-w-[1440px] w-full justify-center mx-auto ">
          <div className="flex flex-col screen744:!flex-row w-full screen744:!justify-between justify-center px-[16px] screen744:!px-[40px] flex-wrap screen744:!flex-nowrap">
            <div className="flex flex-col w-full screen744:!justify-between justify-center">
              <div className="items-center gap-[8px] screen1280:!mt-[35px] mt-[37px] flex flex-row screen744:!justify-start justify-center">
                <SvgMedalLg className="hidden screen1280:!flex" />
                <SvgMedalMd className="flex screen1280:!hidden" />
                <span className="text-text2 font-normal screen1280:!text-[20px] text-[14px]">
                  <span className="text-primary2 font-extrabold">
                    #1 Top rated
                  </span>{" "}
                  CELPIP Resource 2026{" "}
                </span>
              </div>
              <div className="mt-[21px] flex flex-row justify-between w-full screen1280:!mt-[38px] w-full h-[95px] screen744:!h-[135px] screen1280:!h-[245px] screen744:!justify-between justify-center">
                <h1 className="font-bold text-[32px] screen1280:!text-[65px] leading-[40px] screen1280:!leading-[70px] text-text1 screen744:!text-left text-center">
                  Reach Your Target
                  <br />
                  <span className="text-primary2">CELPIP</span> Score.{" "}
                  <br className="screen744:!block hidden" />
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
                      {
                        title1: "",
                        title2: "Guide & Tips",
                        icon: <SvgGuide />,
                      },
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.15 }}
                  >
                    <Image
                      src="/images/hero.png"
                      alt="Hero image of CELPIP preparation platform showing student success"
                      className="hidden screen1280:!flex w-[327px] h-[491px] relative top-[-120px]"
                      width={327}
                      height={491}
                      priority={true}
                      sizes="(max-width: 1280px) 0px, 327px"
                      quality={100}
                      unoptimized
                      loading="eager"
                      fetchPriority="high"
                    />
                  </motion.div>
                </div>
              </div>
              <div className="font-inter font-semibold text-xs leading-5 tracking-normal text-center screen744:!hidden flex justify-center">
                60 mock exams · 3,000+ questions · Instant AI scoring
              </div>
              <div className="flex screen744:!justify-start justify-center">
                <Button
                  href="/practice-overview"
                  size="lg"
                  className="mt-[24px]"
                >
                  <SvgPlus />
                  <span>Start Your Free Practice</span>
                </Button>
              </div>
              <div className="flex flex-row screen1280:!mt-[8px] mt-[14px] screen744:!justify-start justify-center items-center gap-2">
                <Image
                  src="/images/people.png"
                  alt="People icon showing 20,000+ CELPIP graduates trusting CELPIPPRACTICETEST.com"
                  width={65}
                  height={28}
                  className="max-h-[25px]"
                  priority
                />
                <h2 className="text-text1 font-medium leading-[28px] screen1280:!text-[14px] text-[10px]">
                  Trusted by 70k+ test-takers{" "}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards (Desktop & Mobile Unified) */}
        <div className="flex flex-col w-full overflow-hidden">
          <div className="flex flex-row flex-wrap screen744:flex-nowrap px-[16px] screen744:!px-[42px] pt-[22px] pb-[60px] screen744:!pb-[40px] screen1280:!mt-[52px] gap-[12px] screen744:!gap-[16px] screen1280:gap-[24px] w-full max-w-[1440px] mx-auto screen1024:justify-center">
            {[
              {
                title: "Listening",
                icon: <SvgListening className="text-[#1D4ED8]" />,
                bgColor: "bg-primary5",
                link: "/listening",
              },
              {
                title: "Speaking",
                icon: <SvgSpeaking className="text-[#BE123C]" />,
                bgColor: "bg-secondary5",
                link: "/speaking",
              },
              {
                title: "Writing",
                icon: <SvgWriting className="text-[#0D9488]" />,
                bgColor: "bg-success5",
                link: "/writing",
              },
              {
                title: "Reading",
                icon: <SvgReading className="text-[#B91C1C]" />,
                bgColor: "bg-error5",
                link: "/reading",
              },
              {
                title: "Mock Exams",
                icon: <SvgMockExamsColorful />,
                bgColor: "bg-purple5",
                link: "/exam-overview",
              },
              {
                title: "Learning",
                icon: <SvgLearning className="text-[#854D0E]" />,
                bgColor: "bg-[#FEF9C3]",
                link: "/learning",
              },
              {
                title: "Words",
                icon: <SvgWord className="text-[#0D8A72] w-[24px]" />,
                bgColor: "bg-[#CCFBF1]",
                link: "/words",
              },
            ].map((exam, index, array) => {
              const isLast = index === array.length - 1;
              return (
                <ExamSectionCard
                  key={index}
                  title={exam.title}
                  icon={exam.icon}
                  bgColor={exam.bgColor}
                  isLast={isLast}
                  link={exam.link}
                  className={cn("screen744:!w-auto", {
                    "!w-[calc(50%-6px)]": !isLast,
                    "w-full": isLast,
                  })}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;
