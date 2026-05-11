import { redirect } from "next/navigation";
import ForgotSupabasePasswordClient from "./ForgotSupabasePasswordClient";
import { hasAnyWebSession } from "@/lib/auth/web-session-server";

export default async function ForgotSupabasePasswordPage() {
  if (await hasAnyWebSession()) redirect("/practice-overview");

  return <ForgotSupabasePasswordClient />;
}
