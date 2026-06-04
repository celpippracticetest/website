"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Image from "next/image";
import SvgLearning from "@/components/icons/Learning";
import SvgPractice from "@/components/icons/Practice";
import SvgMockTest from "@/components/icons/MockTest";
import {
  SvgMockTestTopNavigationHover,
  SvgPracticeBlueHover,
} from "@/components/icons";
import { TopHeaderRightSideClassic } from "./TopHeaderRightSideClassic";
import PremiumPlanModalClassic from "./PremiumPlanModalClassic";
import SvgWord from "@/components/icons/Word";
import { cn } from "@/lib/utils";
import DashboardHeaderClassic from "@/components/ui-variants/classic/dashboard/DashboardHeaderClassic";

const SvgClose = dynamic(() => import("@/components/icons/Close"), { ssr: false });
const SvgHamburger = dynamic(() => import("@/components/icons/Hamburger"), {
  ssr: true,
});

export type TopHeaderClassicProps = {
  /** `hero` keeps legacy hero stacking; `site` raises z-index and centers on app pages. */
  layout?: "hero" | "site";
};

const TopHeaderClassic = ({ layout = "hero" }: TopHeaderClassicProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const hrefs = ["/exam-overview", "/practice-overview", "/learning", "/words"];
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const sidebarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMenu = (event: MouseEvent) => {
      if (sidebarMenuRef?.current) {
        const target = event.target as Node | null;
        if (!sidebarMenuRef?.current.contains(target)) {
          setIsMenuOpen(false);
        }
      }
    };

    window.document.addEventListener("mousedown", checkMenu);
  }, []);

  useEffect(() => {
    if (isMenuOpen === true && dimensions.width <= 1279) {
      document.body.classList.add("overflow-hidden");
    } else if (isMenuOpen === false && dimensions.width <= 1279) {
      document.body.classList.remove("overflow-hidden");
    }
    if (isMenuOpen === true && dimensions.width > 1279) {
      setIsMenuOpen(false);
    }
  }, [isMenuOpen, dimensions]);

  useEffect(() => {
    const handleSize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleSize);
  }, []);

  const icons = [
    <div key="mock-exam-icon" className="relative  flex items-center justify-center">
      <div className=" w-[24px] h-[24px] flex items-center justify-center group-hover:hidden">
        <SvgMockTest className="  text-[#76808F]  duration-200 " />
      </div>
      <div className="hidden w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
        <SvgMockTestTopNavigationHover className="   text-[#316BFF]   duration-200 group-hover:opacity-100" />
      </div>
    </div>,
    <div key="practice-icon" className="relative w-[24px] h-[24px] flex items-center justify-center">
      <div className=" w-[24px] h-[24px] flex items-center justify-center group-hover:hidden">
        <SvgPractice
          fill="transparent"
          stroke={"#76808F"}
          className="duration-200"
        />
      </div>
      <div className="hidden w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
        <SvgPracticeBlueHover className="text-[#316BFF]   duration-200 group-hover:opacity-100" />
      </div>
    </div>,
    <div key="learn-icon" className="relative  flex items-center justify-center">
      <div className="flex group-hover:hidden w-[24px] h-[24px]  items-center justify-center">
        <SvgLearning
          stroke="#76808F"
          fill="#76808F"
          className="text-[#76808F] group-hover:text-[#316BFF]"
        />
      </div>

      <div className="hidden group-hover:flex w-[24px] h-[24px]  items-center justify-center">
        <SvgWord
          stroke="#76808F"
          fill="#76808F"
          className="text-[#316BFF]"
        />
      </div>
    </div>,
    <div key="mock-exam-icon" className="relative  flex items-center justify-center">
      <div className=" w-[24px] h-[24px] flex items-center justify-center group-hover:hidden">
        <SvgMockTest className="  text-[#76808F]  duration-200 " />
      </div>
      <div className="hidden w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
        <SvgMockTestTopNavigationHover className="   text-[#316BFF]   duration-200 group-hover:opacity-100" />
      </div>
    </div>
  ];

  if (layout === "site") {
    return <DashboardHeaderClassic />;
  }

  return (
    <div className="max-w-[1440px] w-full flex justify-center mx-auto ">
      <div
        className={cn(
          "z-3 flex h-[72px] w-full max-w-[1156px] items-center justify-between border-solid px-[16px] text-center screen744:!px-[24px] screen1280:!h-[80px] screen1280:!px-[40px] fixed border-[1.5px] border-primary5 backdrop-blur-[8px] rounded-es-[32px] rounded-ee-[32px] top-0",
        )}
        style={{
          background:
            "linear-gradient(90deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.2) 100%)",
        }}>
        <div className="flex items-center gap-[12px] screen744:!gap-[24px]">
          <span
            className="screen1280:!hidden flex"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Open menu"
          >
            <SvgHamburger />
          </span>
          <Link className="shrink-0 flex flex-row items-center" href={"/"}>
            <Image
              src="/images/header-logo-left.png"
              alt="logo"
              width={32}
              height={32}
              className="w-[32px] h-[32px] max-[375px]:hidden min-[376px]:inline"
              priority={true}
              sizes="32px"
              quality={90}
              loading="eager"
              fetchPriority="high"
            />
            <Image
              src="/images/header-logo-right.png"
              alt="logo"
              width={84}
              height={40}
              className="w-[63px] screen744:!w-[84px] h-auto"
              priority={true}
              sizes="(max-width: 743px) 63px, 84px"
              quality={90}
              loading="eager"
              fetchPriority="high"
            />
          </Link>
        </div>
        <nav className="gap-[24px] hidden screen1280:!flex">
          {["Mock Exams", "Practice Overview", "Learning", "Words"].map(
            (label, index) => (
              <React.Fragment key={label}>
                <Link
                  className="group gap-[10px] h-[36px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                  href={hrefs[index]}
                >
                  <span className=" text-[16px] font-normal">{label}</span>
                </Link>
                {index != 3 && (
                  <div className="bg-outline w-[1px] h-[35px] rounded-[15px]"></div>
                )}
              </React.Fragment>
            )
          )}
        </nav>
        <TopHeaderRightSideClassic
          onOpenPricing={() => {
            setIsMenuOpen(false);
            setPricingModalOpen(true);
          }}
        />
      </div>

      <PremiumPlanModalClassic
        open={pricingModalOpen}
        onOpenChange={setPricingModalOpen}
      />

      {isMenuOpen && (
        <div className="fixed top-0 w-full h-full  backdrop-blur-[20px] z-[9999999]"></div>
      )}
      <motion.div
        ref={sidebarMenuRef}
        initial={{ x: "100%" }}
        animate={{ x: isMenuOpen ? "0%" : "100%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className={` z-[9999999] fixed right-0 top-0 flex flex-col text-[#3D3B3B] bg-[#f9f9f9] p-[24px] w-full max-w-[720px] h-[100vh]`}
      >
        <div className="flex justify-between">
          <span
            className={` "text-[#232222] text-[20px]  screen1280:flex !font-lobster`}
          >
            <Link className="shrink-0" href={"/"}>
              <Image
                alt="logo"
                width={133}
                height={40}
                src="/images/logo.png"
              />
            </Link>
          </span>
          <span
            className={`cursor-pointer  text-[#232222]`}
            onClick={() => setIsMenuOpen(false)}
          >
            <SvgClose />
          </span>
        </div>
        <div className=" mt-[32px] gap-[16px]">
          {["Mock Exams", "Practice Overview", "Learning", "Words"].map(
            (label, index) => (
              <React.Fragment key={label}>
                <Link
                  key={label}
                  className="h-[36px] group gap-[10px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                  href={hrefs[index]}
                >
                  {icons[index]}

                  <span className=" text-[16px] font-normal">{label}</span>
                </Link>
              </React.Fragment>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TopHeaderClassic;
