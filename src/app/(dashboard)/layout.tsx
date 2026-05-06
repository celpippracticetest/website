import LayoutClient from "@/components/dashboard-new/LayoutClient";
import Footer from "@/components/pages/landing/Footer";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { currentUser } from "@clerk/nextjs/server";
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
  let user = null;
  try {
    user = await currentUser();
  } catch (error) {}

  return (
    <>
      <ReactQueryProvider>
        <LayoutClient>{children}</LayoutClient>
      </ReactQueryProvider>
      {!user && <Footer isSignedIn={false} />}
    </>
  );
}
