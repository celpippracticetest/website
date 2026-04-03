import { headers } from "next/headers";
import Footer from "@/components/pages/landing/Footer";
import FooterWrapper from "@/components/pages/landing/FooterWrapper";

export default async function MarketingFooterSection({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) {
  const h = await headers();
  if (h.get("x-home-ab-variant") === "passport") {
    return null;
  }
  return (
    <FooterWrapper>
      <Footer isSignedIn={isSignedIn} />
    </FooterWrapper>
  );
}
