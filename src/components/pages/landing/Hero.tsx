import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/v2/Button";
import { useHomepageCta } from "@/hooks/useHomepageCta";
import ScoreDiagnostic from "./ScoreDiagnostic";
import TrustRibbon from "./TrustRibbon";
import { cn } from "@/lib/utils";

// SVGs for the bottom section
import SvgListening from "../../icons/Listening";
import SvgSpeaking from "../../icons/Speaking";
import SvgWriting from "../../icons/Writing";
import SvgReading from "../../icons/Reading";
import SvgMockExamsColorful from "../../icons/MockExamsColorful";
import { SvgLearning } from "../../icons";
import SvgWord from "../../icons/Word";

const ExamSectionCard = ({
  title,
  icon,
  bgColor,
  link,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  link: string;
  className?: string;
}) => {
  return (
    <Link
      href={link}
      className={cn(
        "flex flex-col items-center justify-center p-4 screen744:p-6 rounded-[24px] bg-white border border-primary5 shadow-sm hover:shadow-md transition-all group",
        className
      )}
    >
      <div className={cn("w-12 h-12 screen744:w-16 screen744:h-16 rounded-2xl flex items-center justify-center mb-3 screen744:mb-4 group-hover:scale-110 transition-transform", bgColor)}>
        {icon}
      </div>
      <span className="text-sm screen744:text-base font-bold text-text1">{title}</span>
    </Link>
  );
};

type HeroProps = {
  heroImage: {
    imageUrl: string;
    altText: string;
  };
};

const Hero = ({ heroImage }: HeroProps) => {
  const { href, trackClick } = useHomepageCta();

  return (
    <div className="flex flex-col w-full bg-[#F4F7FF]">
      <section className="relative pt-10 screen744:pt-20 screen1280:pt-32 pb-16 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary5/30 to-transparent pointer-events-none z-0" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-secondary5/20 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-[1440px] mx-auto px-6 screen1280:px-10 relative z-10">
          <div className="flex flex-col screen1280:flex-row items-center gap-12 screen1280:gap-20">
            {/* Left Column: Text & Diagnostic */}
            <div className="flex-1 flex flex-col items-center screen1280:items-start text-center screen1280:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary1 text-white text-xs font-bold uppercase tracking-widest mb-6"
              >
                <span className="w-2 h-2 bg-secondary2 rounded-full animate-pulse" />
                #1 Top Rated CELPIP Resource 2026
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl screen744:text-5xl screen1280:text-6xl font-extrabold text-text1 leading-[1.1] mb-6"
              >
                Stop Guessing. <br />
                <span className="text-primary1">Know Your Score</span> <br />
                in 3 Minutes.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg screen744:text-xl text-text2 max-w-[600px] mb-10"
              >
                Our AI diagnostic tool analyzes your current level and builds your custom path to CLB 9+. Join 70,000+ successful candidates.
              </motion.p>

              <div className="w-full flex justify-center screen1280:justify-start">
                <ScoreDiagnostic />
              </div>
            </div>

            {/* Right Column: Visuals */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex-1 relative hidden screen1280:block"
            >
              <div className="relative w-full aspect-square max-w-[600px]">
                {/* Main Hero Image */}
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.altText}
                  fill
                  className="object-contain drop-shadow-2xl z-20"
                  priority
                />
                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-10 right-0 bg-white p-4 rounded-2xl shadow-xl z-30 border border-primary5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success5 text-success rounded-full flex items-center justify-center font-bold">9.0</div>
                    <div>
                      <p className="text-[10px] text-text3 font-bold uppercase">Target Score</p>
                      <p className="text-sm font-bold text-text1">CLB 9+ Reached</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 20, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="absolute bottom-20 left-0 bg-white p-4 rounded-2xl shadow-xl z-30 border border-primary5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary5 text-primary1 rounded-full flex items-center justify-center font-bold">AI</div>
                    <div>
                      <p className="text-[10px] text-text3 font-bold uppercase">AI Coach</p>
                      <p className="text-sm font-bold text-text1">Feedback Ready</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Ribbon Section */}
      <TrustRibbon />

      {/* Navigation Cards Section */}
      <section className="py-16 screen1280:py-24">
        <div className="max-w-[1440px] mx-auto px-6 screen1280:px-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl screen744:text-3xl font-bold text-text1">Explore Our Prep Ecosystem</h2>
          </div>
          <div className="grid grid-cols-2 screen744:grid-cols-4 screen1280:grid-cols-7 gap-4 screen744:gap-6">
            {[
              { title: "Listening", icon: <SvgListening className="text-primary1" />, bgColor: "bg-primary5", link: "/listening" },
              { title: "Speaking", icon: <SvgSpeaking className="text-secondary2" />, bgColor: "bg-secondary5", link: "/speaking" },
              { title: "Writing", icon: <SvgWriting className="text-success" />, bgColor: "bg-success5", link: "/writing" },
              { title: "Reading", icon: <SvgReading className="text-error1" />, bgColor: "bg-error5", link: "/reading" },
              { title: "Mock Exams", icon: <SvgMockExamsColorful />, bgColor: "bg-purple5", link: "/exam-overview" },
              { title: "Learning", icon: <SvgLearning className="text-[#854D0E]" />, bgColor: "bg-[#FEF9C3]", link: "/learning" },
              { title: "Words", icon: <SvgWord className="text-[#0D8A72]" />, bgColor: "bg-[#CCFBF1]", link: "/words" },
            ].map((item, index) => (
              <ExamSectionCard
                key={index}
                title={item.title}
                icon={item.icon}
                bgColor={item.bgColor}
                link={item.link}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;
