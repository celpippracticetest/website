/**
 * Read GA4 `client_id` / `session_id` in the browser so Stripe metadata can replay
 * the same identifiers on Measurement Protocol (renewals, server-side purchase).
 *
 * Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to the same value as `GA_MEASUREMENT_ID` (G-…)
 * so `gtag('get', …)` can return canonical ids; otherwise `_ga` cookie parsing is used
 * for `client_id` only.
 */

const PENDING_CLIENT = "pending_ga4_client_id";
const PENDING_SESSION = "pending_ga4_session_id";

/** Classic `_ga=GA1.x.<clientId>` shape → `<digits>.<digits>`. */
export function readGa4ClientIdFromGaCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return null;
  const raw = decodeURIComponent(match[1].trim());
  const parts = raw.split(".");
  if (parts.length < 4) return null;
  const clientId = `${parts[2]}.${parts[3]}`;
  return /^\d+\.\d+$/.test(clientId) ? clientId : null;
}

/** Merge latest GA4 ids from `localStorage` (e.g. right before POST checkout). */
export function mergePendingGa4IntoAttribution(
  attribution: Record<string, string>
): Record<string, string> {
  const ga4 = loadPendingGa4IdsFromStorage();
  return {
    ...attribution,
    ...(ga4.clientId ? { ga4_client_id: ga4.clientId } : {}),
    ...(ga4.sessionId ? { ga4_session_id: ga4.sessionId } : {}),
  };
}

export function loadPendingGa4IdsFromStorage(): {
  clientId: string | null;
  sessionId: string | null;
} {
  if (typeof window === "undefined") return { clientId: null, sessionId: null };
  const clientId = window.localStorage.getItem(PENDING_CLIENT)?.trim() || null;
  const sessionId = window.localStorage.getItem(PENDING_SESSION)?.trim() || null;
  return { clientId, sessionId };
}

export function persistPendingGa4Ids(
  clientId: string,
  sessionId: string | null | undefined
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_CLIENT, clientId);
    if (sessionId?.trim()) {
      window.localStorage.setItem(PENDING_SESSION, sessionId.trim());
    } else {
      window.localStorage.removeItem(PENDING_SESSION);
    }
  } catch {
    // Quota / private mode
  }
}

export async function resolveGa4BrowserIds(
  measurementId: string | undefined
): Promise<{ clientId: string | null; sessionId: string | null }> {
  const fromCookie = readGa4ClientIdFromGaCookie();
  if (typeof window === "undefined") {
    return { clientId: null, sessionId: null };
  }

  const mid = measurementId?.trim();
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (!mid || typeof gtag !== "function") {
    return { clientId: fromCookie, sessionId: null };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (clientId: string | null, sessionId: string | null) => {
      if (settled) return;
      settled = true;
      resolve({
        clientId: clientId || fromCookie,
        sessionId,
      });
    };

    try {
      gtag("get", mid, "client_id", (cid: unknown) => {
        const clientId =
          typeof cid === "string" && cid.trim() ? cid.trim() : fromCookie;
        try {
          gtag("get", mid, "session_id", (sid: unknown) => {
            if (sid == null || sid === "") {
              finish(clientId, null);
              return;
            }
            const sessionId =
              typeof sid === "number"
                ? String(Math.trunc(sid))
                : String(sid).trim() || null;
            finish(clientId, sessionId);
          });
        } catch {
          finish(clientId, null);
        }
      });
    } catch {
      finish(fromCookie, null);
    }

    window.setTimeout(() => finish(fromCookie, null), 1200);
  });
}
