import { PracticeNavigationRefresh } from "@/components/practice-seo/PracticeNavigationRefresh";

export default function WritingSlugLayout({
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
