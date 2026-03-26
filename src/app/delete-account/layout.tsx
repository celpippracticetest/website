import PublicPageShell from "@/components/pages/landing/PublicPageShell";

export default function DeleteAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
