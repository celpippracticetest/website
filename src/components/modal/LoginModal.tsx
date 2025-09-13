import React, { useEffect, useRef } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Close from "../icons/Close";

const LoginModal = (params: any) => {
  const { setShowLoginModal } = params;
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setShowLoginModal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="z-[9999] px-[16px] fixed top-0 left-0 right-0 mx-auto w-full h-full bg-[#17161680] flex justify-center items-center">
      <div
        ref={loginRef}
        className="flex-col relative w-[440px] pt-[24px]  pb-[18px]  h-[270px] rounded-[24px] bg-white "
      >
        <div
          onClick={() => setShowLoginModal(false)}
          className="absolute right-[20px] cursor-pointer"
        >
          <Close />
        </div>
        <div className="text-[#212E42] text-[20px] text-center font-semibold">
          Login to your account
        </div>
        <div className="text-[#76808F] mt-[12px] text-[14px] text-center font-normal">
          Please log in to start the exam{" "}
          <SignUpButton>
            <div className="text-[14px] mx-[16px] cursor-pointer flex items-center justify-center text-white bg-[#4A7DFF] rounded-[24px] h-[40px] mt-[12px]  text-center font-normal">
              Create a free account
            </div>
          </SignUpButton>
        </div>

        <div className="flex justify-center items-center mt-[32px] gap-[20px]">
          <div className="h-[1px] w-full bg-[#D5D6D8]"></div>
          <span className="text-[#37465C] text-[14px]">Or</span>
          <div className="h-[1px] w-full bg-[#D5D6D8]"></div>
        </div>
        <div className="text-[16px]   mt-[32px]  text-center font-medium">
          <span>Do you have an account? </span>{" "}
          <SignInButton>
            <span className="text-[#316BFF] cursor-pointer"> Login </span>
          </SignInButton>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
