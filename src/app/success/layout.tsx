"use client";

const appBaseUrl = process.env.APP_BASE_URL || "";
const isPreview = appBaseUrl.includes("vercel.app");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {isPreview && (
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
      )}
      <div className="w-full bg-[#F4F7FF]">{children}</div>
    </>
  );
}
