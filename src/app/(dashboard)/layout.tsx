import LayoutClient from "@/components/dashboard-new/LayoutClient";
import IntercomLoader from "@/components/IntercomLoader";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <IntercomLoader />
      <LayoutClient children={children} />
    </>
  );
}
