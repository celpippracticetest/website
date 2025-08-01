import { Link } from "lucide-react";
import React from "react";
import Image from "next/image";

const ReferralFooter = () => {
  return (
    <div>
      <footer
        aria-label="Site footer"
        className="h-[344px] mt-[40px] screen744:!mt-[60px] screen1280:!mt-[76px] mx-auto flex justify-center bg-primary5"
      >
        <div className="flex flex-col max-w-[1440px] w-full">
          <div className="flex flex-col screen744:!flex-row screen744:!gap-[180px] justify-center px-[16px]">
            <div className="mt-[40px] flex flex-col items-center">
              <Link href={"/"}>
                <Image
                  alt="logo"
                  width={133}
                  height={40}
                  src="/images/logo.png"
                />
              </Link>

              <div className="mt-[21px] max-w-[484px]">
                <span className="text-text3 font-light text-[12px] screen744:!text-[14px] screen1280:!text-[18px] flex text-justify">
                  CELPIPPRACTICETEST.com is an independent platform and is not
                  affiliated with, endorsed by, or associated with Paragon
                  Testing Enterprises or the official CELPIP test
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
              </div>
            </div>
          </div>

          <div className="flex mt-[56px] screen744:!mt-[72px] justify-center px-[16px] text-center">
            <span className="text-text3 font-normal text-[11px] screen744:!text-[14px] ">
              © 2025 CELPIPPRACTICETEST.com — Not affiliated with Paragon
              Testing Enterprises. All rights reserved{" "}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ReferralFooter;
