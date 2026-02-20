type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
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

export async function sendEmailWithSender({
  to,
  subject,
  html,
  from,
}: SendEmailArgs): Promise<void> {
  const token = assertEnv("SENDER_API_TOKEN");
  const fromHeader =
    from || process.env.FROM_EMAIL || process.env.SMTP_USER || "no-reply@localhost";
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
