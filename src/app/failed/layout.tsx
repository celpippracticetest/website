import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";

export default function FailedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicPageShell footer={<PublicPageFooter />}>{children}</PublicPageShell>
  );
}
