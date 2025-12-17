import React, { useEffect } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";
import Image from "next/image";

const Footer = () => {
  const { ref, inView } = useInView();
  const { setInFooter, isInFooter } = useButtonVisibleStore((state) => state);

  useEffect(() => {
    if (inView) {
      setInFooter(true);
    } else {
      setInFooter(false);
    }
  }, [inView]);

  return (
    <footer
      ref={ref}
      aria-label="Site footer"
      className="h-[444px] screen744:!h-[368px] mx-auto flex justify-center bg-primary5"
    >
      <div className="flex flex-col max-w-[1440px] w-full">
        <div className="flex flex-col screen744:!flex-row screen744:!gap-[180px] justify-center px-[24px]">
          <div className="mt-[24px] screen744:!mt-[48px]">
            <Link href={"/"}>
              <Image
                alt="logo"
                width={133}
                height={40}
                src="/images/logo.png"
              />
            </Link>

            <div className="mt-[16px] screen744:!max-w-238 screen1280:!max-w-[460px]">
              <span className="text-text3 font-light text-[14px] screen744:!text-[12px] screen1280:!text-[18px] flex text-justify">
                CELPIPPRACTICETEST.com is an independent platform and is not
                affiliated with, endorsed by, or associated with Paragon Testing
                Enterprises or the official CELPIP test
              </span>
            </div>
            <div className="flex gap-[16px] mt-[12px]">
              <Link
                href="/terms-of-service"
                className="text-text2 font-normal text-[14px]"
              >
                <span>Terms of Service</span>
              </Link>
              <Link
                href="/privacy-policy"
                className="text-text2 font-normal text-[14px]"
              >
                <span>Privacy Policy</span>
              </Link>
              <Link
                href="/"
                className="text-text2 font-normal text-[14px]"
              >
                <span>Refund Policy</span>
              </Link>
            </div>
          </div>

          <div className="mt-[30px] screen744:!mt-[85px] h-[126px] max-w-[236px] w-full self-center screen744:!self-start">
            <h2 className="text-text1 font-semibold h-[19px] text-[16px]">
              Links
            </h2>

            <nav aria-label="Footer navigation">
              <ul className="flex mt-[20px] gap-[40px]">
                <li>
                  <ul className="flex gap-[15px] flex-col max-w-[98px] w-full">
                    <li className="text-text2 font-normal h-[19px] text-[16px]">
                      <Link href={"/listening"}>Listening</Link>
                    </li>
                    <li className="text-text2 font-normal h-[19px] text-[16px]">
                      <Link href={"/speaking"}>Speaking</Link>
                    </li>
                    <li className="text-text2 font-normal h-[19px] text-[16px]">
                      <Link href={"/writing"}>Writing</Link>
                    </li>
                    <li className="text-text2 font-normal h-[19px] text-[16px]">
                      <Link href={"/"}>Ai Learning</Link>
                    </li>
                  </ul>
                </li>
                <li>
                  <ul className="flex gap-[15px] flex-col max-w-[98px] w-full">
                    <li className="text-text2 font-normal h-[19px] text-[16px]">
                      <Link href={"/reading"}>Reading</Link>
                    </li>
                    <li className="text-text2 font-normal h-[19px] text-[16px]">
                      <Link href={"/exam-overview"}> Mock Exams</Link>
                    </li>
                    <li className="text-text2 font-normal h-[19px] text-[16px]">
                      <Link href={"https://blog.celpippracticetest.com/"}> Blog</Link>
                    </li>
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="flex mt-[10px]  screen744:!mt-[30px] screen1280:!mt-[50px] justify-center">
          <span className="text-text3 font-normal text-[14px] ">
            {`© ${new Date().getFullYear()} CELPIPPRACTICETEST.com. All rights reserved.`}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
