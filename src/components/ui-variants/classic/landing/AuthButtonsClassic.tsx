"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasEverPurchased } from "@/hooks/useHasEverPurchased";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useRouter } from "next/navigation";
import { signOutWebSession } from "@/lib/auth/client-sign-out";
import { Button } from "@/components/v2/Button";

export default function AuthButtonsClassic() {
  const { isSignedIn, user, isLoaded } = useHybridWebUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isUserDropDownOpen, setUserDropDownOpen] = useState(false);
  const roles = (user?.publicMetadata as Record<string, unknown> | undefined)?.[
    "roles"
  ] as string[] | undefined;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { hasEverPurchased } = useHasEverPurchased();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropDownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem("hasClosedExtraDiscountModal");
    await signOutWebSession(router, "/sign-in?mode=sign-in");
  };

  if (!mounted || !isLoaded) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  return (
    <>
      {isSignedIn && (
        <div className="relative mr-[24px] flex items-center" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropDownOpen(!isUserDropDownOpen)}
            className="h-10 w-10 cursor-pointer"
          >
            {user?.imageUrl ? (
              <img
                className="h-10 w-10 rounded-full p-1 ring-2 ring-gray-300"
                src={user.imageUrl}
                alt="User Avatar"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                {user?.firstName?.[0]?.toUpperCase() ||
                  user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
                  "U"}
              </div>
            )}
          </button>

          {isUserDropDownOpen && (
            <div className="absolute right-0 top-[48px] z-[100] mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5">
              <div className="py-1">
                {roles?.includes("admin") && (
                  <a
                    href="/cms/dashboard"
                    className="block w-full px-4 py-2 text-left text-[14px] text-gray-700"
                    role="menuitem"
                    tabIndex={-1}
                  >
                    CMS Dashboard
                  </a>
                )}
                <Link
                  href="/league"
                  className="block px-4 py-2 text-left text-[14px] text-gray-700"
                >
                  League
                </Link>
                {hasEverPurchased && (
                  <Link
                    href="/earn100"
                    className="block px-4 py-2 text-left text-[14px] text-gray-700"
                  >
                    Referral
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-left text-[14px] text-gray-700"
                >
                  Profile
                </Link>
                <Link href="/contact-us" className="block px-4 py-2 text-[14px] text-gray-700">
                  Support
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full cursor-pointer px-4 py-2 text-left text-[14px] text-gray-700"
                  role="menuitem"
                  tabIndex={-1}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {!isSignedIn && (
        <>
          <Button size="sm" className="max-[744px]:flex min-[744px]:hidden" href="/sign-up">
            <span id="sign-up-button">Sign Up</span>
          </Button>
          <Button size="md" className="max-[744px]:hidden min-[744px]:flex" href="/sign-up">
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
}
