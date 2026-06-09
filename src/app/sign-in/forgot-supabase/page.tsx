import { redirect } from "next/navigation";
import ForgotSupabasePasswordClient from "./ForgotSupabasePasswordClient";
import { hasAnyWebSession } from "@/lib/auth/web-session-server";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/sign-in/forgot-supabase");

export default async function ForgotSupabasePasswordPage() {
  if (await hasAnyWebSession()) redirect("/practice-overview");

  return <ForgotSupabasePasswordClient />;
}
