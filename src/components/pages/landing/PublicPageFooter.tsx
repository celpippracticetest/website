import { hasAnyWebSession } from "@/lib/auth/web-session-server";
import { headers } from "next/headers";
import Footer from "./Footer";

export default async function PublicPageFooter() {
  const h = await headers();
  if (h.get("x-home-ab-variant") === "passport") {
    return null;
  }

  const isSignedIn = await hasAnyWebSession();
  return <Footer isSignedIn={isSignedIn} />;
}
