import type { Metadata } from "next";
import { AppSessionBridge } from "@/components/auth/AppSessionBridge";

export const metadata: Metadata = {
  title: "App session",
  robots: { index: false, follow: false },
};

export default function AppSessionPage() {
  return <AppSessionBridge />;
}
