import { PracticeNavigationRefresh } from "@/components/practice-seo/PracticeNavigationRefresh";

export default function SpeakingSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PracticeNavigationRefresh />
      {children}
    </>
  );
}
