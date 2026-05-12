"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const DASHBOARD_FIRST_SEGMENTS = new Set([
  "earn100",
  "exam-overview",
  "exams",
  "listening",
  "plans",
  "practice-overview",
  "profile",
  "reading",
  "speaking",
  "words",
  "writing",
]);

export default function FooterWrapper({ children }: { children: ReactNode }) {
  const { isSignedIn } = useHybridWebUser();
  const pathname = usePathname();
  const firstSegment = pathname?.split("/")[1];
  const isDashboard =
    firstSegment && DASHBOARD_FIRST_SEGMENTS.has(firstSegment);

  if (isSignedIn || isDashboard) return null;
  return <>{children}</>;
}
