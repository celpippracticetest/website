"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
const AuthButtons = dynamic(() => import("./AuthButtons"), { ssr: false });
import Image from "next/image";

const SvgClose = dynamic(() => import("../../icons/Close"), { ssr: false });
const SvgDiamond = dynamic(() => import("../../icons/Diamond"), { ssr: true });
const SvgHamburger = dynamic(() => import("../../icons/Hamburger"), {
  ssr: true,
});
interface ITopHeader {
  planRef?: React.RefObject<HTMLDivElement | null>;
}

const TopHeader = ({ planRef }: ITopHeader) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hrefs = [
    "/exam-overview",
    "/practice-overview",
    "/wiki",
    "https://blog.celpippracticetest.com/",
  ];
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
              alt="logo"
              priority
              width={133}
              height={40}
              src="/images/logo.png"
              className="w-[133px] h-[40px]"
            />
          </Link>
        </div>
        <nav className="gap-[24px] hidden screen1280:!flex">
          {["Mock Exams", "Practice Overview", "CELPIP Wiki", "Blog"].map(
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
                      className="h-[36px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                      href={hrefs[index]}
                    >
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
          {planRef ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Scroll to Plans Section"
              onClick={() => {
                if (planRef.current) {
                  planRef.current.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="ml-[14px] hover:cursor-pointer screen744:!ml-0 relative w-[40px] h-[40px] border-[1px] border-neutral2 rounded-[24px] flex items-center justify-center"
            >
              <SvgDiamond />
              <div className="absolute leading-[16px] font-semibold    flex text-white items-center justify-center bg-error1 rounded-[16px] w-[34px] h-[20px] -top-[12px] -right-[12px] rotate-[10px] text-[10px]">
                PRO
              </div>
            </div>
          ) : (
            <Link
              className="ml-[14px] hover:cursor-pointer screen744:!ml-0 relative w-[40px] h-[40px] border-[1px] border-neutral2 rounded-[24px] flex items-center justify-center"
              href="/#plans"
            >
              {" "}
              <SvgDiamond />
              <div className="absolute leading-[16px] font-semibold    flex text-white items-center justify-center bg-error1 rounded-[16px] w-[34px] h-[20px] -top-[12px] -right-[12px] rotate-[10px] text-[10px]">
                PRO
              </div>
            </Link>
          )}
          <AuthButtons />
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
          {["Mock Exams", "Practice Overview", "CELPIP Wiki", "Blog"].map(
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
                    className="h-[36px] flex items-center underline-offset-[8px] decoration-[2px] hover:underline text-text2 hover:cursor-pointer hover:!text-primary1"
                    href={hrefs[index]}
                  >
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
