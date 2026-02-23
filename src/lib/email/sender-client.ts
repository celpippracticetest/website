type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

type SenderSubscriberInput = {
  email: string;
  firstName: string;
  listId?: string;
  source?: string;
};

type SenderGroup = {
  id: string;
  name: string;
};

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function resolveSenderToken(): string {
  return process.env.SENDER_API_KEY || process.env.SENDER_API_TOKEN || "";
}

function parseFromHeader(fromHeader: string): { email: string; name?: string } {
  const trimmed = fromHeader.trim();
  const match = trimmed.match(/^(.+?)<(.+?)>$/);
  if (!match) {
    return { email: trimmed };
  }

  return {
    name: match[1].trim().replace(/^"|"$/g, ""),
    email: match[2].trim(),
  };
}

function normalizeRecipients(to: string | string[]) {
  const recipients = Array.isArray(to) ? to : [to];
  return recipients.map((email) => ({ email: email.trim() }));
}

async function postJson(
  url: string,
  token: string,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function getJson(url: string, token: string): Promise<Response> {
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
}

export async function sendEmailWithSender({
  to,
  subject,
  html,
  from,
}: SendEmailArgs): Promise<void> {
  const token = resolveSenderToken();
  if (!token) {
    throw new Error("Missing required env: SENDER_API_KEY or SENDER_API_TOKEN");
  }
  const fromHeader =
    from ||
    process.env.FROM_EMAIL ||
    process.env.SMTP_USER ||
    "noreply@celpippracticetest.com";
  const fromParsed = parseFromHeader(fromHeader);
  const recipients = normalizeRecipients(to);

  const baseUrl = (process.env.SENDER_API_BASE_URL || "https://api.sender.net/v2").replace(
    /\/$/,
    ""
  );

  const attempts: Array<{
    url: string;
    body: Record<string, unknown>;
  }> = [
    {
      url: `${baseUrl}/emails`,
      body: {
        from: fromParsed,
        to: recipients,
        subject,
        html,
      },
    },
    {
      url: `${baseUrl}/email`,
      body: {
        from: fromParsed,
        to: recipients,
        subject,
        html,
      },
    },
    {
      url: `${baseUrl}/emails`,
      body: {
        from: fromHeader,
        to: recipients.map((r) => r.email),
        subject,
        html,
      },
    },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    const response = await postJson(attempt.url, token, attempt.body);
    if (response.ok) return;

    const text = await response.text().catch(() => "");
    errors.push(`${attempt.url} -> ${response.status} ${text}`.trim());
  }

  throw new Error(
    `Sender API request failed. Attempts: ${errors.join(" | ")}`
  );
}

export async function upsertSenderSubscriber({
  email,
  firstName,
  listId,
  source,
}: SenderSubscriberInput): Promise<void> {
  const token = resolveSenderToken();
  if (!token) {
    throw new Error("Missing required env: SENDER_API_KEY or SENDER_API_TOKEN");
  }

  const baseUrl = (
    process.env.SENDER_API_BASE_URL || "https://api.sender.net/v2"
  ).replace(/\/$/, "");

  const senderEmail = "noreply@celpippracticetest.com";
  const resolvedListId = listId || process.env.SENDER_LIST_ID;
  const emailTrimmed = email.trim().toLowerCase();
  const firstNameTrimmed = firstName.trim();

  const attempts: Array<{ url: string; body: Record<string, unknown> }> = [
    {
      url: `${baseUrl}/subscribers`,
      body: {
        email: emailTrimmed,
        firstname: firstNameTrimmed,
        from: senderEmail,
        groups: resolvedListId ? [resolvedListId] : undefined,
        trigger_automation: true,
        source: source || "celpippracticetest.com lead popup",
      },
    },
    {
      url: `${baseUrl}/contacts`,
      body: {
        email: emailTrimmed,
        firstName: firstNameTrimmed,
        from: senderEmail,
        listIds: resolvedListId ? [resolvedListId] : undefined,
        triggerAutomation: true,
        source: source || "celpippracticetest.com lead popup",
      },
    },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    const body = Object.fromEntries(
      Object.entries(attempt.body).filter(([, value]) => value !== undefined)
    );
    const response = await postJson(attempt.url, token, body);
    if (response.ok) return;
    const text = await response.text().catch(() => "");
    errors.push(`${attempt.url} -> ${response.status} ${text}`.trim());
  }

  throw new Error(`Sender subscriber sync failed. Attempts: ${errors.join(" | ")}`);
}

function extractSenderGroups(payload: any): SenderGroup[] {
  const rawList =
    payload?.data ||
    payload?.items ||
    payload?.groups ||
    payload?.lists ||
    payload?.results ||
    [];
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((item: any) => ({
      id: String(item?.id ?? item?._id ?? item?.group_id ?? item?.list_id ?? ""),
      name: String(item?.name ?? item?.title ?? item?.group_name ?? item?.list_name ?? ""),
    }))
    .filter((item: SenderGroup) => item.id && item.name);
}

export async function listSenderGroups(): Promise<SenderGroup[]> {
  const token = resolveSenderToken();
  if (!token) {
    throw new Error("Missing required env: SENDER_API_KEY or SENDER_API_TOKEN");
  }

  const baseUrl = (
    process.env.SENDER_API_BASE_URL || "https://api.sender.net/v2"
  ).replace(/\/$/, "");

  const endpoints = [
    `${baseUrl}/groups`,
    `${baseUrl}/lists`,
    `${baseUrl}/subscribers/groups`,
  ];

  const errors: string[] = [];

  for (const endpoint of endpoints) {
    const response = await getJson(endpoint, token);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      errors.push(`${endpoint} -> ${response.status} ${text}`.trim());
      continue;
    }

    const payload = await response.json().catch(() => ({}));
    const groups = extractSenderGroups(payload);
    if (groups.length > 0) {
      return groups;
    }
  }

  throw new Error(`Failed to fetch Sender groups. Attempts: ${errors.join(" | ")}`);
}

export type { SenderGroup };
export { resolveSenderToken, assertEnv };
