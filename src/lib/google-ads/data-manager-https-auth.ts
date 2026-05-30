import "server-only";

import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function readHttpsCredentials() {
  const username = process.env.GOOGLE_DATA_MANAGER_HTTPS_USERNAME?.trim();
  const password = process.env.GOOGLE_DATA_MANAGER_HTTPS_PASSWORD?.trim();
  if (!username || !password) return null;
  return { username, password };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isGoogleDataManagerHttpsConfigured() {
  return readHttpsCredentials() != null;
}

export function verifyGoogleDataManagerHttpsAuth(request: NextRequest) {
  const credentials = readHttpsCredentials();
  if (!credentials) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) return false;

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return (
    safeEqual(username, credentials.username) &&
    safeEqual(password, credentials.password)
  );
}

export function googleDataManagerHttpsUnauthorizedResponse() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Google Ads Data Manager"',
    },
  });
}
