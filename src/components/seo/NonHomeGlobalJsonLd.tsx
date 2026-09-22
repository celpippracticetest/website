"use client";

import { JsonLd } from "@/components/seo/JsonLd";
import { usePathname } from "next/navigation";

export function NonHomeGlobalJsonLd({
  schemas,
}: {
  schemas: Record<string, unknown>[];
}) {
  const pathname = usePathname();
  if (pathname === "/") return null;

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
