import { NextRequest, NextResponse } from "next/server";
import { submitUrls } from "@/lib/indexnow";

const SITE_URL = "https://celpippracticetest.com";

/**
 * GET ?source=sitemap — fetch sitemap and submit all URLs to IndexNow.
 * POST { "urls": string[] } — submit given URLs to IndexNow.
 *
 * Protected by CRON_SECRET (same as other cron routes) so you can call from
 * Vercel Cron or manually: GET /api/indexnow/submit?source=sitemap&token=YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("source") !== "sitemap") {
    return NextResponse.json(
      { error: "Use ?source=sitemap to submit sitemap URLs" },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const authorized =
    (authHeader && secret && authHeader === `Bearer ${secret}`) ||
    (token && secret && token === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch sitemap index and follow all main-domain sitemaps
    const indexRes = await fetch(`${SITE_URL}/sitemap.xml`);
    if (!indexRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch sitemap index", status: indexRes.status },
        { status: 502 }
      );
    }
    const indexXml = await indexRes.text();
    const sitemapLocMatches = indexXml.matchAll(/<loc>([^<]+)<\/loc>/g);
    const sitemapUrls = [...sitemapLocMatches].map((m) => m[1].trim());

    // Only follow sitemaps that belong to our main domain (skip blog subdomain, etc.)
    let mainDomainSitemaps = sitemapUrls.filter((u) =>
      u.startsWith(SITE_URL + "/")
    );
    if (mainDomainSitemaps.length === 0) {
      mainDomainSitemaps = [`${SITE_URL}/sitemap-0.xml`];
    }

    const allUrls: string[] = [];
    for (const sitemapUrl of mainDomainSitemaps) {
      const res = await fetch(sitemapUrl);
      if (!res.ok) continue;
      const xml = await res.text();
      const urlMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
      const pageUrls = [...urlMatches]
        .map((m) => m[1].trim())
        .filter((u) => u.startsWith(SITE_URL));
      allUrls.push(...pageUrls);
    }

    const urls = [...new Set(allUrls)];

    if (urls.length === 0) {
      return NextResponse.json({
        ok: true,
        submitted: 0,
        message: "No URLs found in sitemap",
      });
    }

    const result = await submitUrls(urls);
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      submitted: urls.length,
      message: result.message,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "IndexNow submit failed", message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const authorized =
    authHeader && secret && authHeader === `Bearer ${secret}`;
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { urls?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Use { urls: string[] }" },
      { status: 400 }
    );
  }

  const urls = Array.isArray(body?.urls) ? body.urls : [];
  if (urls.length === 0) {
    return NextResponse.json(
      { error: "Body must contain urls: string[]" },
      { status: 400 }
    );
  }

  const result = await submitUrls(urls);
  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    submitted: urls.length,
    message: result.message,
  });
}
