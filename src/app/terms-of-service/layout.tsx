import PublicPageShell from "@/components/pages/landing/PublicPageShell";

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
