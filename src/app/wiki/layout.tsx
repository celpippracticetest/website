import { Metadata } from "next";
import TopHeader from "@/components/pages/landing/TopHeader";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

export default function WikiLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-[#F4F7FF] min-h-screen flex flex-col">
      <TopHeader />
      <main className="flex-grow pt-[100px] pb-10">{children}</main>
    </div>
  );
}
