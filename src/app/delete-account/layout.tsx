import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";

export default function DeleteAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicPageShell footer={<PublicPageFooter />}>{children}</PublicPageShell>
  );
}
