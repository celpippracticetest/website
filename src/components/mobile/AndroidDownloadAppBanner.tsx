"use client";

import CloseIcon from "@mui/icons-material/Close";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ANDROID_APP_STORE_URL,
  ANDROID_DOWNLOAD_BANNER_HEIGHT_PX,
  dismissAndroidDownloadBanner,
  isAndroidDownloadBannerDismissed,
  isAndroidMobileBrowser,
} from "@/lib/mobile/androidDownloadBanner";
import { cn } from "@/lib/utils";

export default function AndroidDownloadAppBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const syncVisibility = useCallback(() => {
    if (pathname === "/app") {
      setVisible(false);
      return;
    }
    if (isAndroidDownloadBannerDismissed()) {
      setVisible(false);
      return;
    }
    setVisible(isAndroidMobileBrowser());
  }, [pathname]);

  useEffect(() => {
    syncVisibility();
    window.addEventListener("resize", syncVisibility);
    return () => window.removeEventListener("resize", syncVisibility);
  }, [syncVisibility]);

  useEffect(() => {
    const height = visible ? `${ANDROID_DOWNLOAD_BANNER_HEIGHT_PX}px` : "0px";
    document.documentElement.style.setProperty(
      "--android-download-banner-height",
      height,
    );
    return () => {
      document.documentElement.style.removeProperty(
        "--android-download-banner-height",
      );
    };
  }, [visible]);

  const handleDismiss = () => {
    dismissAndroidDownloadBanner();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[1210] border-b border-white/10",
        "bg-[#212E42] text-white screen744:hidden",
      )}
      style={{ height: ANDROID_DOWNLOAD_BANNER_HEIGHT_PX }}
      role="region"
      aria-label="Download the Android app"
    >
      <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-2 px-3">
        <Image
          src="/favicon/android-chrome-192x192.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-lg"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight">
            CELPIP Practice Test
          </p>
          <p className="truncate text-[11px] leading-tight text-white/75">
            Practice on the go with our Android app
          </p>
        </div>
        <a
          href={ANDROID_APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "shrink-0 rounded-full bg-primary1 px-3 py-1.5 text-xs font-semibold text-white",
            "transition-opacity hover:opacity-90",
          )}
        >
          Get app
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss download app banner"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}
