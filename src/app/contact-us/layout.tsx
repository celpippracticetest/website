import PublicPageShell from "@/components/pages/landing/PublicPageShell";

export default function ContactUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
