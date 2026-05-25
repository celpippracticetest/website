import { PracticeNavigationRefresh } from "@/components/practice-seo/PracticeNavigationRefresh";

export default function ListeningSlugLayout({
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
