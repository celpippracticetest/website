import { hasAnyWebSession } from "@/lib/auth/web-session-server";
import Footer from "./Footer";

export default async function PublicPageFooter() {
  const isSignedIn = await hasAnyWebSession();
  return <Footer isSignedIn={isSignedIn} />;
}
