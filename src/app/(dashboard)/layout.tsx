import LayoutClient from "@/components/dashboard-new/LayoutClient";
import IntercomLoader from "@/components/IntercomLoader";
import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const vercelEnv = appBaseUrl.includes("vercel.app")
    ? "preview"
    : "production";
  return (
    <>
      {vercelEnv === "preview" && (
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
      )}
      <IntercomLoader />
      <LayoutClient children={children} />
    </>
  );
}
