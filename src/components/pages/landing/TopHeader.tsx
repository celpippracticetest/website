"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
const AuthButtons = dynamic(() => import("./AuthButtons"), { ssr: false });
import Image from "next/image";
import SvgLearning from "@/components/icons/Learning";
import SvgPractice from "@/components/icons/Practice";
import SvgMockTest from "@/components/icons/MockTest";
import {
  SvgMockTestTopNavigationHover,
  SvgPracticeBlueHover,
} from "@/components/icons";
import useStore from "@/store";

const SvgClose = dynamic(() => import("../../icons/Close"), { ssr: false });
const SvgDiamond = dynamic(() => import("../../icons/Diamond"), { ssr: true });
const SvgHamburger = dynamic(() => import("../../icons/Hamburger"), {
  ssr: true,
});
const TopHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const setPremiumPlanModalState = useStore((state) => state.setPremiumPlanModalState);

  const hrefs = ["/exam-overview", "/practice-overview", "/learning"];
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const sidebarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMenu = (event: any) => {
      if (sidebarMenuRef?.current) {
        if (!sidebarMenuRef?.current.contains(event.target)) {
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
    <div className="relative  flex items-center justify-center">
      <div className=" w-[24px] h-[24px] flex items-center justify-center group-hover:hidden">
        <SvgMockTest className="  text-[#76808F]  duration-200 " />
      </div>
      <div className="hidden w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
        <SvgMockTestTopNavigationHover className="   text-[#316BFF]   duration-200 group-hover:opacity-100" />
      </div>
    </div>,
    <div className="relative w-[24px] h-[24px] flex items-center justify-center">
      <div className=" w-[24px] h-[24px] flex items-center justify-center group-hover:hidden">
        <SvgPractice
          fill="transparent"
          stroke={"#76808F"}
          className="    duration-200 "
        />
      </div>
      <div className="hidden w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
        <SvgPracticeBlueHover className="   text-[#316BFF]   duration-200 group-hover:opacity-100" />
      </div>
    </div>,
    <div className="relative  flex items-center justify-center">
      <div className="flex group-hover:hidden w-[24px] h-[24px]  items-center justify-center">
        <SvgLearning
          stroke="#76808F"
          fill="transparent"
          className="text-[#76808F] group-hover:text-[#316BFF]"
        />
      </div>

      <div className="hidden group-hover:flex w-[24px] h-[24px]  items-center justify-center">
        <SvgLearning
          stroke="#316BFF"
          fill="#316BFF"
          className="text-[#316BFF]"
        />
      </div>
    </div>,
  ];

  return (
    <div className="max-w-[1440px]  w-full flex justify-center mx-auto ">
      <div
        className="
            z-3
        max-w-[1156px]
        w-full
        screen1280:!h-[80px]
        h-[72px]
        flex
        items-center
        justify-between
        text-center
         bg-[linear-gradient(90deg,_rgba(255,_255,_255,_0.65)_0%,_rgba(255,_255,_255,_0.2)_100%)]
        border-solid
        fixed
        top-0
        border-[1.5px]
        backdrop-blur-[8px]
        border-primary5
        rounded-es-[32px]
        rounded-ee-[32px]"
      >
        <div className="flex ml-[16px] screen744:!ml-[24px] screen1280:!ml-[40px] items-center gap-[12px] screen744:!gap-[24px]">
          <span
            className="flex screen1280:!hidden"
            onClick={() => setIsMenuOpen && setIsMenuOpen(!isMenuOpen)}
            aria-label="Open menu"
          >
            <SvgHamburger />
          </span>
          <Link className="shrink-0" href={"/"}>
            <Image
              src="/images/logo.png"
              alt="logo"
              width={133}
              height={40}
              className="w-[133px] h-[40px]"
              priority={true}
              sizes="133px"
              quality={90}
              loading="eager"
              fetchPriority="high"
            />
          </Link>
        </div>
        <nav className="gap-[24px] hidden screen1280:!flex">
          {["Mock Exams", "Practice Overview", "Learning"].map(
            (label, index) => (
              <React.Fragment key={label}>
                {index === 3 ? (
                  <>
                    <div className="bg-outline w-[1px] h-[35px] rounded-[15px]"></div>

                    <a
                      rel="noopener noreferrer"
                      className="h-[36px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                      href={hrefs[index]}
                      target="_blank"
                    >
                      <span className=" text-[16px] font-normal">{label}</span>
                    </a>
                  </>
                ) : (
                  <>
                    <Link
                      className="group gap-[10px] h-[36px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                      href={hrefs[index]}
                    >
                      {icons[index]}

                      <span className=" text-[16px] font-normal">{label}</span>
                    </Link>
                    {index != 2 && (
                      <div className="bg-outline w-[1px] h-[35px] rounded-[15px]"></div>
                    )}
                  </>
                )}
              </React.Fragment>
            )
          )}
        </nav>
        <div className="flex gap-[8px] screen1280:!gap-[28px]">
          <div
            role="button"
            tabIndex={0}
            aria-label="Open Premium Plans"
            onClick={() => setPremiumPlanModalState()}
            className="ml-[14px] hover:cursor-pointer screen744:!ml-0 relative w-[40px] h-[40px] border-[1px] border-neutral2 rounded-[24px] flex items-center justify-center"
          >
            <SvgDiamond />
            <div className="absolute leading-[16px] font-semibold    flex text-white items-center justify-center bg-error1 rounded-[16px] w-[34px] h-[20px] -top-[12px] -right-[12px] rotate-[10px] text-[10px]">
              PRO
            </div>
          </div>
          <div className="h-[40px]  w-[149px]  flex items-center justify-center">
            <AuthButtons />
          </div>
        </div>
      </div>

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
          {["Mock Exams", "Practice Overview", "Learning"].map(
            (label, index) => (
              <React.Fragment key={label}>
                {index === 3 ? (
                  <a
                    className="h-[36px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                    href={hrefs[index]}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className=" text-[16px] font-normal">{label}</span>
                  </a>
                ) : (
                  <Link
                    key={label}
                    className="h-[36px] group gap-[10px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                    href={hrefs[index]}
                  >
                    {icons[index]}

                    <span className=" text-[16px] font-normal">{label}</span>
                  </Link>
                )}
              </React.Fragment>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TopHeader;
