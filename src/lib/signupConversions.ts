import {
  normalizeAppClientPlatform,
  type AppClientPlatform,
} from "@/lib/appClientPlatform";
import { sendGa4Events } from "@/lib/ga4MeasurementProtocol";
import {
  META_EVENT,
  metaEventIdCompleteRegistration,
} from "@/lib/meta-constants";
import { sendMetaCapiEvents } from "@/lib/metaConversionsApi";

/** Fire GA4 MP `sign_up` + Meta CAPI CompleteRegistration for a new auth user. */
export async function sendSignupConversionEvents(args: {
  userId: string;
  email?: string | null;
  method?: string;
  eventSourceUrl?: string | null;
  appPlatform?: string | null;
}): Promise<void> {
  const userId = args.userId.trim();
  if (!userId) return;

  const method = args.method?.trim() || "email";
  const eventId = metaEventIdCompleteRegistration(userId);
  const appPlatform: AppClientPlatform =
    normalizeAppClientPlatform(args.appPlatform) ?? "web";

  void sendGa4Events({
    clientId: userId,
    userId,
    events: [
      {
        name: "sign_up",
        params: {
          method,
          source_page: args.eventSourceUrl || undefined,
          app_platform: appPlatform,
        },
      },
    ],
  });

  void sendMetaCapiEvents({
    events: [
      {
        eventName: META_EVENT.COMPLETE_REGISTRATION,
        eventId,
        eventSourceUrl: args.eventSourceUrl || undefined,
        userData: {
          email: args.email,
          externalId: userId,
        },
        customData: {
          value: 1,
          currency: "CAD",
        },
      },
    ],
  });
}
