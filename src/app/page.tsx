import dynamic from "next/dynamic";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  },
);

export default function HomePage() {
  return (
    <PublicPageShell liveBackground footer={<PublicPageFooter />}>
      <HomePageClient />
    </PublicPageShell>
  );
}
