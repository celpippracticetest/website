"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy per-stage editor — redirects to the unified sequence page. */
export default function AbandonedCartEmailEditorRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const stageId = typeof params?.stageId === "string" ? params.stageId : "";

  useEffect(() => {
    const target = stageId
      ? `/cms/dashboard/abandoned-cart-emails#${encodeURIComponent(stageId)}`
      : "/cms/dashboard/abandoned-cart-emails";
    router.replace(target);
  }, [router, stageId]);

  return null;
}
