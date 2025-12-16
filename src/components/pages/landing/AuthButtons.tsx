"use client";
import { Button } from "@/components/v2/Button";
import { SignedIn, useUser } from "@clerk/nextjs";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";

import { useState, useEffect, useRef } from "react";

const AuthButtons = () => {
  const { isSignedIn } = useUser();
  const [isUserDropDownOpen, setUserDropDownOpen] = useState(false);
  const { user } = useUser();
  const roles = (user?.publicMetadata as Record<string, unknown> | undefined)?.["roles"] as
    | string[]
    | undefined;
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
        <div className="mr-[24px] flex items-center" ref={dropdownRef}>
          <button
            onClick={() => setUserDropDownOpen(!isUserDropDownOpen)}
            className="cursor-pointer w-10 h-10"
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
                {roles?.includes("admin") && (
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
                  href="/league"
                  className="block text-left px-4 py-2 text-[14px] text-gray-700"
                >
                  League
                </Link>
                <Link
                  href="/profile"
                  className="block text-left px-4 py-2 text-[14px] text-gray-700"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      const w = window as unknown as {
                        Intercom?: (cmd: string) => void;
                      };
                      if (w.Intercom) {
                        w.Intercom("show");
                      }
                    }
                  }}
                  id="support-button"
                  className="cursor-pointer block px-4 py-2 text-[14px] text-gray-700 w-full text-left"
                >
                  Support
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem("hasClosedExtraDiscountModal");
                    signOut();
                  }}
                  className="cursor-pointer block px-4 py-2 text-[14px] text-gray-700 w-full text-left"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
      {!isSignedIn && (
        <>
          <Button size="sm" className="max-[744px]:flex min-[744px]:hidden">
            <span id="sign-up-button">Sign Up</span>
          </Button>
          <Button size="md" className="max-[744px]:hidden min-[744px]:flex">
            <span id="sign-up-button" className="flex">
              Sign Up
              <span className="mx-1">/</span>
              Login
            </span>
          </Button>
        </>
      )}
    </>
  );
};

export default AuthButtons;
