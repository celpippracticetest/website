"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Footer from "./Footer";

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

export default function FooterWrapper() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const firstSegment = pathname?.split("/")[1];
  const isDashboard =
    firstSegment && DASHBOARD_FIRST_SEGMENTS.has(firstSegment);

  if (isSignedIn || isDashboard) return null;
  return <Footer isSignedIn={isSignedIn} />;
}
