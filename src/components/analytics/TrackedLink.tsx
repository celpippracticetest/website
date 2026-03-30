"use client";

import Link from "next/link";
import { useEventTracker } from "@/hooks/useTracking";
import { ReactNode } from "react";

interface TrackedLinkProps {
  href: string;
  children: ReactNode;
  navType?: 'header' | 'footer' | 'mobile' | 'bottom';
  className?: string;
  [key: string]: any;
}

/**
 * TrackedLink Component
 * A wrapper around Next.js Link that tracks navigation clicks
 */
export default function TrackedLink({
  href,
  children,
  navType = 'header',
  className,
  ...props
}: TrackedLinkProps) {
  const { trackNav } = useEventTracker();

  const handleClick = () => {
    // Extract text from children if it's a string, otherwise use href
    const linkText = typeof children === 'string' ? children : href;
    trackNav(linkText, href, navType);
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </Link>
  );
}
