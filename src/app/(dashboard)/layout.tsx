import LayoutClient from "@/components/dashboard-new/LayoutClient";
import Footer from "@/components/pages/landing/Footer";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { getDashboardLayoutAuthContext } from "@/lib/auth/web-session-server";
import { Metadata } from "next";

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
  const ctx = await getDashboardLayoutAuthContext();

  return (
    <>
      <ReactQueryProvider>
        <LayoutClient>{children}</LayoutClient>
      </ReactQueryProvider>
      {!ctx && <Footer isSignedIn={false} />}
    </>
  );
}
