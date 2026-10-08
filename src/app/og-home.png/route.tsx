import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Homepage social share image (1200 x 630), referenced by og:image / twitter:image.
// Rendered from the hero design so it stays on brand without a separate asset.
export const revalidate = 86400;

export async function GET() {
  const mascot = await readFile(path.join(process.cwd(), "public/images/hero.png"));
  const mascotSrc = `data:image/png;base64,${mascot.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          background: "linear-gradient(115deg, #FCE3D5 0%, #F7F0EC 40%, #E6F6FB 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#37465C" }}>
            <span style={{ fontWeight: 800, color: "#2554D6" }}>Free CELPIP Practice Tests</span>
            <span>&nbsp;with AI Scoring</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 24,
              fontSize: 76,
              lineHeight: 1.08,
              fontWeight: 800,
              color: "#212E42",
              letterSpacing: -1,
            }}
          >
            <span>Reach Your Target</span>
            <span style={{ display: "flex" }}>
              <span style={{ color: "#4A7DFF" }}>CELPIP</span>
              <span>&nbsp;Score.</span>
            </span>
            <span style={{ color: "#F4845F", fontStyle: "italic" }}>Faster.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
            <div
              style={{
                display: "flex",
                padding: "18px 34px",
                borderRadius: 999,
                background: "#2554D6",
                color: "#FFFFFF",
                fontSize: 28,
                fontWeight: 600,
                boxShadow: "6px 6px 0 0 #759CFF",
              }}
            >
              Start Your Free Practice
            </div>
            <span style={{ marginLeft: 28, fontSize: 24, color: "#37465C" }}>celpippracticetest.com</span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs a plain img */}
        <img src={mascotSrc} alt="" width={330} height={495} style={{ objectFit: "contain" }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
