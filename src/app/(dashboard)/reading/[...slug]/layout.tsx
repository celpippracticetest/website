import { PracticeNavigationRefresh } from "@/components/practice-seo/PracticeNavigationRefresh";

export default function ReadingSlugLayout({
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
