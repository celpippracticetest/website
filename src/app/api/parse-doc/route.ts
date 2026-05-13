import { NextRequest, NextResponse } from "next/server";

let access_token = "";
let expires_at = 0;
let topic = "";
let currentQuestionType = "";
let questionBuffer: string[] = [];

function isExpired() {
  return Date.now() >= expires_at - 60_000;
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    console.error("❌ Failed to refresh token", data);
    throw new Error("Failed to refresh access token");
  }

  access_token = data.access_token;
  expires_at = Date.now() + data.expires_in * 1000;

  return access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { docId } = await req.json();

    if (!docId) {
      return NextResponse.json({ error: "Missing docId" }, { status: 400 });
    }

    if (!access_token || isExpired()) {
      await refreshAccessToken();
    }

    const fetchWithToken = async () => {
      return fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
    };

    let response = await fetchWithToken();

    if (response.status === 401) {
      console.warn("🔁 Access token expired mid-request, refreshing...");
      await refreshAccessToken();
      response = await fetchWithToken();
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Google Docs API error",
          status: response.status,
          message: errorText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.body?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Invalid doc format" },
        { status: 500 }
      );
    }

    const passages: any[] = [];
    let currentPassage: any = null;

    for (const item of content) {
      const text = item.paragraph?.elements
        ?.map((el: any) => el.textRun?.content || "")
        .join("")
        .trim();

      if (!text) continue;

      const lower = text.toLowerCase();

      if (text.toLowerCase().startsWith("topic:")) {
        topic = text.split(/topic:/i)[1].trim();
        continue;
      }

      if (/^(?:passage\s*\d*:\s*)?subject:/i.test(text)) {
        if (currentPassage && currentPassage.title === "") {
          const cleaned = text
            .replace(/^(?:passage\s*\d*:\s*)?subject:\s*/i, "")
            .trim();
          currentPassage.title = cleaned;
          continue;
        }
      }

      if (lower.includes("multiple-choice questions")) {
        currentQuestionType = "MULTIPLE_CHOICE";
        questionBuffer = [];
        continue;
      }
      if (lower.includes("dropdown questions")) {
        currentQuestionType = "DROPDOWN";
        questionBuffer = [];
        continue;
      }

      if (text.toLowerCase().startsWith("passage")) {
        if (currentPassage) passages.push(currentPassage);
        currentPassage = {
          id: (passages.length + 1).toString(),
          title: text,
          body: "",
          questions: [],
        };
        currentQuestionType = "";
        questionBuffer = [];
      } else if (currentQuestionType) {
        if (text.includes("Correct Answer:")) {
          const raw = [...questionBuffer, text].join("\n");

          const answerMatch = raw.match(/Correct Answer:\s*([A-D])/i);
          const answer = answerMatch?.[1]?.trim().toLowerCase() || "";

          const cleanedRaw = raw.replace(/Correct Answer:\s*[A-D]/i, "");

          const optionRegex = /^([A-D])\)\s+(.+)$/gm;
          const choices: { id: string; text: string }[] = [];
          let match;
          while ((match = optionRegex.exec(cleanedRaw)) !== null) {
            choices.push({
              id: match[1].toLowerCase(),
              text: match[2].trim(),
            });
          }

          const questionText = cleanedRaw
            .replace(optionRegex, "")
            .replace(/\s+/g, " ")
            .trim();

          if (currentPassage) {
            currentPassage?.questions?.push({
              id: (currentPassage?.questions?.length + 1).toString(),
              question: questionText,
              type:
                currentQuestionType === "DROPDOWN"
                  ? "FILL_THE_GAP"
                  : "MULTIPLE_CHOICE_QUESTION",
              choices,
              answer,
            });
          }

          questionBuffer = [];
        } else {
          questionBuffer.push(text);
        }
      } else {
        if (currentPassage) {
          const processed = text.replace(/_+|[\u2013\u2014]+/g, "${Q}");
          currentPassage.body += processed + "\n";
        }
      }
    }

    if (currentPassage) passages.push(currentPassage);

    passages.forEach((p) => {
      p.title = p.title
        .replace(/^(?:passage\s*\d*:\s*)?/i, "")
        .replace(/^(?:subject:\s*)/i, "")
        .trim();
    });

    return NextResponse.json({ topic, passages });
  } catch (err: any) {
    console.error("❌ Unexpected Error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
