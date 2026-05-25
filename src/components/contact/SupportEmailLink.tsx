"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { buildSupportEmail, buildSupportMailto } from "@/lib/contact/support-email";

type SupportEmailLinkProps = {
  className?: string;
  subject?: string;
  fallbackClassName?: string;
  children?: ReactNode;
};

/** Renders after mount so Cloudflare does not inject /cdn-cgi/l/email-protection scripts. */
export default function SupportEmailLink({
  className = "text-primary1 underline underline-offset-2",
  subject,
  fallbackClassName,
  children,
}: SupportEmailLinkProps) {
  const [href, setHref] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setHref(buildSupportMailto(subject));
    setLabel(buildSupportEmail());
  }, [subject]);

  if (!href || !label) {
    return (
      <Link href="/contact-us" className={fallbackClassName ?? className}>
        {children ?? "Contact support"}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {children ?? label}
    </a>
  );
}
