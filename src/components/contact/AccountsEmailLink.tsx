"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildAccountsEmail, buildAccountsMailto } from "@/lib/contact/support-email";

type AccountsEmailLinkProps = {
  className?: string;
  subject?: string;
};

export default function AccountsEmailLink({
  className = "text-primary1 underline underline-offset-2",
  subject,
}: AccountsEmailLinkProps) {
  const [href, setHref] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setHref(buildAccountsMailto(subject));
    setLabel(buildAccountsEmail());
  }, [subject]);

  if (!href || !label) {
    return (
      <Link href="/contact-us" className={className}>
        Contact billing
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}
