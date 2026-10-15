"use client";

import { JsonLd } from "@/components/seo/JsonLd";
import { usePathname } from "next/navigation";

function isBlogPath(pathname: string | null): boolean {
  return pathname === "/blog" || Boolean(pathname?.startsWith("/blog/"));
}

/** Site-wide JSON-LD, skipped on the homepage (it has its own) and optionally on blog pages. */
export function NonHomeGlobalJsonLd({
  schemas,
  showOnHome = false,
  hideOnBlog = false,
}: {
  schemas: Record<string, unknown>[];
  showOnHome?: boolean;
  hideOnBlog?: boolean;
}) {
  const pathname = usePathname();
  if (pathname === "/" && !showOnHome) return null;
  if (hideOnBlog && isBlogPath(pathname)) return null;

  return (
    <>
      {schemas.map((data, index) => (
        <JsonLd
          key={String(data["@id"] ?? data["@type"] ?? index)}
          data={data}
        />
      ))}
    </>
  );
}
