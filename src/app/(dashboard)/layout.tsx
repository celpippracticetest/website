import LayoutClient from "@/components/dashboard-new/LayoutClient";
import Footer from "@/components/pages/landing/Footer";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { userNeedsOnboardingSurvey } from "@/lib/userNeedsOnboardingSurvey";
import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Dashboard",
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  try {
    user = await currentUser();
  } catch (error) {}

  if (userNeedsOnboardingSurvey(user ?? undefined)) {
    redirect("/onboarding-survey");
  }

  return (
    <>
      <ReactQueryProvider>
        <LayoutClient>{children}</LayoutClient>
      </ReactQueryProvider>
      {!user && <Footer isSignedIn={false} />}
    </>
  );
}
