import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function PartnersDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/partners/auth");
  }

  return <>{children}</>;
}
