import dynamic from "next/dynamic";

const HomePagePremium = dynamic(
  () => import("@/components/pages/landing/HomePagePremium"),
  {
    ssr: true,
  },
);

export default function HomePage() {
  return <HomePagePremium />;
}
