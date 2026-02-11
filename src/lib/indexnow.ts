/**
 * IndexNow: submit URLs to Bing and other search engines for faster indexing.
 * @see https://www.bing.com/indexnow/getstarted
 */

const INDEXNOW_API = "https://api.indexnow.org";
const INDEXNOW_KEY = "943943da09e54ed5a5cda6e011e1ae76";
const SITE_HOST = "celpippracticetest.com";
const KEY_LOCATION = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;

export type IndexNowResult = {
  ok: boolean;
  status: number;
  message?: string;
};

/**
 * Submit a list of URLs to IndexNow (Bing, Yandex, etc.).
 * Max 10,000 URLs per request; batch if you have more.
 */
export async function submitUrls(urlList: string[]): Promise<IndexNowResult> {
  if (urlList.length === 0) {
    return { ok: true, status: 200, message: "No URLs to submit" };
  }

  const body = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  const res = await fetch(`${INDEXNOW_API}/IndexNow`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  const ok = res.ok;
  const status = res.status;
  let message: string | undefined;
  if (!ok && res.body) {
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {
      message = res.statusText;
    }
  }

  return { ok, status, message };
}

/**
 * Submit a single URL via GET (IndexNow also supports single-URL GET).
 */
export async function submitSingleUrl(url: string): Promise<IndexNowResult> {
  const params = new URLSearchParams({
    url,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
  });
  const res = await fetch(
    `${INDEXNOW_API}/IndexNow?${params.toString()}`,
    { method: "GET" }
  );
  return {
    ok: res.ok,
    status: res.status,
    message: res.ok ? undefined : (await res.text()) || res.statusText,
  };
}
