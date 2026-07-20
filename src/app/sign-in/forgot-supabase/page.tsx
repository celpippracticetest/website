import { redirect } from "next/navigation";
import ForgotSupabasePasswordClient from "./ForgotSupabasePasswordClient";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";
import { hasAnyWebSession } from "@/lib/auth/web-session-server";

export default async function ForgotSupabasePasswordPage() {
  if (await hasAnyWebSession()) redirect(DEFAULT_POST_AUTH_PATH);

  return <ForgotSupabasePasswordClient />;
}
