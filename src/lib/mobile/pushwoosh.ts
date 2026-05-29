import "server-only";

const PUSHWOOSH_NOTIFY_URL = "https://api.pushwoosh.com/messaging/v2/notify";
const USER_BATCH_SIZE = 100;

type PushwooshNotifyResponse = {
  message_code?: string;
  unknown_identifiers?: {
    users?: string[];
    hwids?: string[];
    push_tokens?: string[];
  };
};

export type PracticeReminderPushPayload = {
  title: string;
  body: string;
  route?: string;
};

function getPushwooshConfig():
  | { apiToken: string; appCode: string }
  | { error: string } {
  const apiToken =
    process.env.PUSHWOOSH_API_ACCESS_TOKEN?.trim() ||
    process.env.PUSHWOOSH_API_TOKEN?.trim() ||
    "";
  const appCode =
    process.env.PUSHWOOSH_APP_CODE?.trim() ||
    process.env.PUSHWOOSH_APP_ID?.trim() ||
    "";

  if (!apiToken || !appCode) {
    return {
      error:
        "Pushwoosh is not configured. Set PUSHWOOSH_API_ACCESS_TOKEN and PUSHWOOSH_APP_CODE (or PUSHWOOSH_APP_ID).",
    };
  }

  return { apiToken, appCode };
}

export function chunkUserIds(userIds: string[], size = USER_BATCH_SIZE): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < userIds.length; index += size) {
    chunks.push(userIds.slice(index, index + size));
  }
  return chunks;
}

export async function sendPushwooshPracticeReminderToUsers(
  userIds: string[],
  payload: PracticeReminderPushPayload
): Promise<PushwooshNotifyResponse> {
  const config = getPushwooshConfig();
  if ("error" in config) {
    throw new Error(config.error);
  }

  if (userIds.length === 0) {
    return {};
  }

  const scheduleAt = new Date().toISOString();
  const response = await fetch(PUSHWOOSH_NOTIFY_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactional: {
        application: config.appCode,
        platforms: ["IOS", "ANDROID"],
        users: { list: userIds },
        payload: {
          content: {
            localized_content: {
              en: {
                ios: {
                  title: payload.title,
                  body: payload.body,
                },
                android: {
                  title: payload.title,
                  body: payload.body,
                },
              },
            },
          },
          data: {
            route: payload.route || "/",
            type: "practice_reminder",
          },
        },
        schedule: { at: scheduleAt },
        message_type: "MESSAGE_TYPE_TRANSACTIONAL",
        return_unknown_identifiers: true,
      },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as PushwooshNotifyResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      body.message || `Pushwoosh notify failed with status ${response.status}`
    );
  }

  return body;
}

export function extractUnknownPushwooshUserIds(
  response: PushwooshNotifyResponse
): string[] {
  return response.unknown_identifiers?.users ?? [];
}
