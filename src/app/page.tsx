"use client";
import dynamic from "next/dynamic";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  }
);
export default function HomePage() {
  return <HomePageClient />;
}
