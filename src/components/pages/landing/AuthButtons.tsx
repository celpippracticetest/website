"use client";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  useUser,
  SignUpButton,
} from "@clerk/nextjs";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";

import { useState, useEffect, useRef } from "react";

const AuthButtons = () => {
  const { isSignedIn } = useUser();
  const [isUserDropDownOpen, setUserDropDownOpen] = useState(false);
  const { user }: any = useUser();
  const { signOut } = useClerk();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropDownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <>
      <SignedIn>
        <div className="relative mr-[24px]" ref={dropdownRef}>
          <button
            onClick={() => setUserDropDownOpen(!isUserDropDownOpen)}
            className="cursor-pointer"
          >
            {user && user.imageUrl ? (
              <img
                className="w-10 h-10 p-1 rounded-full ring-2 ring-gray-300"
                src={user.imageUrl}
                alt="User Avatar"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                {user?.firstName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </button>

          {isUserDropDownOpen && (
            <div className="absolute right-0 z-10 mt-2 w-56 top-[48px] rounded-md bg-white ring-1 shadow-lg ring-black/5">
              <div className="py-1">
                {user &&
                  user.publicMetadata.roles &&
                  user.publicMetadata.roles.includes("admin") && (
                    <a
                      href="/cms/dashboard"
                      className="block px-4 py-2 text-[14px] text-gray-700 w-full text-left"
                      role="menuitem"
                      tabIndex={-1}
                      id="menu-item-0"
                    >
                      CMS Dashboard
                    </a>
                  )}

                <Link
                  href="/profile"
                  className="block text-left px-4 py-2 text-[14px] text-gray-700"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      (window as any).Intercom
                    ) {
                      (window as any).Intercom("show");
                    }
                  }}
                  id="support-button"
                  className="block px-4 py-2 text-[14px] text-gray-700 w-full text-left"
                >
                  Support
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem("hasClosedExtraDiscountModal");
                    signOut();
                  }}
                  className="block px-4 py-2 text-[14px] text-gray-700 w-full text-left"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
      {!isSignedIn && (
        <div className="mr-[24px] h-[40px]  w-[100px] screen1280:!w-[149px] flex items-center justify-center">
          <SignedOut>
            <div
              className="group hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] shadow-startButton  w-[100px] screen1280:!w-[149px] hover:cursor-pointer
                 cursor-pointer bg-primary2 screen1280:!bg-white rounded-[24px] screen1280:border-[1.5px] h-full screen1280:border-neutral2 hover:!border-none flex items-center justify-center"
            >
              <span className="hidden screen1280:!flex items-center justify-center h-[40px] font-medium text-[14px] hover:text-white text-black w-[146px]">
                <SignUpButton>Sign Up </SignUpButton>
                <span className="mx-1">/</span>
                <SignInButton>Login</SignInButton>
              </span>
              <span className="flex screen1280:!hidden items-center justify-center h-[40px] font-normal text-[14px] text-white w-[100px]">
                <SignUpButton>Sign Up </SignUpButton>
              </span>
            </div>
          </SignedOut>
        </div>
      )}
    </>
  );
};

export default AuthButtons;
