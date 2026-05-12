"use client";
import { Button } from "@/components/v2/Button";
import Link from "next/link";

import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasEverPurchased } from "@/hooks/useHasEverPurchased";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useClerk } from "@clerk/nextjs";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

const AuthButtons = () => {
  type ChallengeStatus = {
    active: boolean;
    targetClb?: number | null;
    daysLeft?: number | null;
  };
  const { isSignedIn, user, isLoaded } = useHybridWebUser();
  const { signOut } = useClerk();
  const [mounted, setMounted] = useState(false);
  const [isUserDropDownOpen, setUserDropDownOpen] = useState(false);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null);
  const roles = (user?.publicMetadata as Record<string, unknown> | undefined)?.["roles"] as
    | string[]
    | undefined;
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

  useEffect(() => {
    if (!isSignedIn) {
      setChallengeStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/challenge-status", { method: "GET" });
        const data = (await res.json()) as ChallengeStatus;
        if (!cancelled) setChallengeStatus(data?.active ? data : { active: false });
      } catch {
        if (!cancelled) setChallengeStatus({ active: false });
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn]);

  const handleSignOut = async () => {
    localStorage.removeItem("hasClosedExtraDiscountModal");
    const supabase = createBrowserSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    await signOut({ redirectUrl: "/sign-in" });
  };

  if (!mounted || !isLoaded) {
    return <Skeleton className="w-10 h-10 rounded-full" />;
  }

  return (
    <>
      {isSignedIn && (
        <div className="relative mr-[24px] flex items-center" ref={dropdownRef}>
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
                {user?.firstName?.[0]?.toUpperCase() || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </button>

          {isUserDropDownOpen && (
            <div className="absolute right-0 z-[100] mt-2 w-56 top-[48px] rounded-md bg-white ring-1 shadow-lg ring-black/5">
              <div className="py-1">
                {challengeStatus?.active && (
                  <div className="mx-2 mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      Refund Challenge Active
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-slate-800">
                      Target CLB {challengeStatus.targetClb ?? "—"}{" "}
                      <span className="font-normal text-slate-500">•</span>{" "}
                      {typeof challengeStatus.daysLeft === "number"
                        ? `${challengeStatus.daysLeft} day${challengeStatus.daysLeft === 1 ? "" : "s"} left`
                        : "Deadline in progress"}
                    </p>
                  </div>
                )}
                {roles?.includes("admin") && (
                  <a
                    href="/cms/dashboard"
                    className="block px-4 py-2 text-[14px] text-gray-700 w-full text-left"
                    role="menuitem"
                    tabIndex={-1}
                  >
                    CMS Dashboard
                  </a>
                )}
                <Link href="/league" className="block text-left px-4 py-2 text-[14px] text-gray-700">
                  League
                </Link>
                {hasEverPurchased && (
                  <Link href="/earn100" className="block text-left px-4 py-2 text-[14px] text-gray-700">
                    Referral
                  </Link>
                )}
                <Link href="/profile" className="block text-left px-4 py-2 text-[14px] text-gray-700">
                  Profile
                </Link>
                <Link href="/contact-us" className="block px-4 py-2 text-[14px] text-gray-700">
                  Support
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-[14px] text-gray-700 cursor-pointer"
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
          <Button size="sm" className="max-[744px]:flex min-[744px]:hidden" href="/sign-in">
            <span id="sign-up-button">Sign Up</span>
          </Button>
          <Button size="md" className="max-[744px]:hidden min-[744px]:flex" href="/sign-in">
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
