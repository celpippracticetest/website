"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { FooterBase, GUEST_FOOTER_SECTIONS, UserFooter } from "./FooterContent";

export default function PublicPageFooterClient() {
  const { isSignedIn } = useHybridWebUser();

  if (isSignedIn) {
    return <UserFooter />;
  }

  return <FooterBase sections={GUEST_FOOTER_SECTIONS} />;
}
