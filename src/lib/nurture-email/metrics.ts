import { getDb } from "@/lib/appDocumentsClient";
import { getSql } from "@/lib/pg/pool";

export const NURTURE_METRICS_COLLECTION = "usernurtureemailstats";
export const NURTURE_EVENTS_COLLECTION = "usernurtureemailevents";
export const NURTURE_EMAIL_KIND = "nurture";

export type NurtureEmailEventType = "opened" | "clicked";

export type NurtureEmailStatsSummary = {
  totals: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  };
  byStage: Array<{
    stageId: string;
    stageLabel: string;
    flow: string;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }>;
  byFlow: Array<{
    flow: string;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }>;
};

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

async function applyNurtureEngagementToStats(input: {
  eventType: NurtureEmailEventType;
  resendMessageId: string;
  occurredAt: Date;
  userId?: string;
  stageId?: string;
}): Promise<boolean> {
  const sql = getSql();
  const isOpen = input.eventType === "opened";
  const userId = input.userId?.trim();
  const stageId = input.stageId?.trim();

  if (isOpen) {
    const byMessageId = await sql<Array<{ mongo_id: string }>>`
      UPDATE public.user_nurture_email_stats
      SET
        opened_at = COALESCE(opened_at, ${input.occurredAt}),
        last_opened_at = ${input.occurredAt},
        open_count = open_count + 1,
        resend_message_id = COALESCE(resend_message_id, ${input.resendMessageId})
      WHERE resend_message_id = ${input.resendMessageId}
      RETURNING mongo_id
    `;
    if (byMessageId.length > 0) return true;
  } else {
    const byMessageId = await sql<Array<{ mongo_id: string }>>`
      UPDATE public.user_nurture_email_stats
      SET
        clicked_at = COALESCE(clicked_at, ${input.occurredAt}),
        last_clicked_at = ${input.occurredAt},
        click_count = click_count + 1,
        resend_message_id = COALESCE(resend_message_id, ${input.resendMessageId})
      WHERE resend_message_id = ${input.resendMessageId}
      RETURNING mongo_id
    `;
    if (byMessageId.length > 0) return true;
  }

  if (!userId || !stageId) return false;

  if (isOpen) {
    const byUserStage = await sql<Array<{ mongo_id: string }>>`
      UPDATE public.user_nurture_email_stats
      SET
        opened_at = COALESCE(opened_at, ${input.occurredAt}),
        last_opened_at = ${input.occurredAt},
        open_count = open_count + 1,
        resend_message_id = COALESCE(resend_message_id, ${input.resendMessageId})
      WHERE mongo_id = (
        SELECT mongo_id
        FROM public.user_nurture_email_stats
        WHERE user_id = ${userId} AND stage_id = ${stageId}
        ORDER BY sent_at DESC
        LIMIT 1
      )
      RETURNING mongo_id
    `;
    return byUserStage.length > 0;
  }

  const byUserStage = await sql<Array<{ mongo_id: string }>>`
    UPDATE public.user_nurture_email_stats
    SET
      clicked_at = COALESCE(clicked_at, ${input.occurredAt}),
      last_clicked_at = ${input.occurredAt},
      click_count = click_count + 1,
      resend_message_id = COALESCE(resend_message_id, ${input.resendMessageId})
    WHERE mongo_id = (
      SELECT mongo_id
      FROM public.user_nurture_email_stats
      WHERE user_id = ${userId} AND stage_id = ${stageId}
      ORDER BY sent_at DESC
      LIMIT 1
    )
    RETURNING mongo_id
  `;
  return byUserStage.length > 0;
}

export async function recordNurtureEmailEvent(input: {
  svixId: string;
  eventType: NurtureEmailEventType;
  resendMessageId: string;
  occurredAt: Date;
  tags?: Record<string, string | undefined>;
}): Promise<{ recorded: boolean; updatedStat: boolean }> {
  const db = await getDb();
  const eventsCollection = db.collection(NURTURE_EVENTS_COLLECTION);

  try {
    await eventsCollection.insertOne({
      _id: input.svixId,
      eventType: input.eventType,
      resendMessageId: input.resendMessageId,
      userId: input.tags?.user_id,
      stageId: input.tags?.stage_id,
      flow: input.tags?.flow,
      occurredAt: input.occurredAt,
      createdAt: new Date(),
    });
  } catch {
    return { recorded: false, updatedStat: false };
  }

  const updatedStat = await applyNurtureEngagementToStats({
    eventType: input.eventType,
    resendMessageId: input.resendMessageId,
    occurredAt: input.occurredAt,
    userId: input.tags?.user_id,
    stageId: input.tags?.stage_id,
  });

  return { recorded: true, updatedStat };
}

/** Re-apply engagement from stored webhook events (e.g. after fixing stats updates). */
export async function backfillNurtureEmailEngagementFromEvents(): Promise<{
  processed: number;
  updated: number;
}> {
  const db = await getDb();
  const events = await db
    .collection(NURTURE_EVENTS_COLLECTION)
    .find({})
    .sort({ occurredAt: 1 })
    .toArray();

  let updated = 0;
  for (const event of events) {
    const doc = event as Record<string, unknown>;
    const eventType = doc.eventType;
    const resendMessageId = doc.resendMessageId;
    const occurredAt = doc.occurredAt;
    if (
      (eventType !== "opened" && eventType !== "clicked") ||
      typeof resendMessageId !== "string" ||
      !(occurredAt instanceof Date)
    ) {
      continue;
    }

    const didUpdate = await applyNurtureEngagementToStats({
      eventType,
      resendMessageId,
      occurredAt,
      userId: typeof doc.userId === "string" ? doc.userId : undefined,
      stageId: typeof doc.stageId === "string" ? doc.stageId : undefined,
    });
    if (didUpdate) updated += 1;
  }

  return { processed: events.length, updated };
}

export async function getNurtureEmailStatsSummary(): Promise<NurtureEmailStatsSummary> {
  const sql = getSql();

  const [totalsRow] = await sql<
    Array<{ sent: number; opened: number; clicked: number }>
  >`
    SELECT
      COUNT(*)::int AS sent,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked
    FROM public.user_nurture_email_stats
  `;

  const byStage = await sql<
    Array<{
      stage_id: string | null;
      stage_label: string | null;
      flow: string | null;
      sent: number;
      opened: number;
      clicked: number;
    }>
  >`
    SELECT
      stage_id,
      stage_label,
      flow,
      COUNT(*)::int AS sent,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked
    FROM public.user_nurture_email_stats
    GROUP BY stage_id, stage_label, flow
    ORDER BY sent DESC
  `;

  const byFlow = await sql<
    Array<{
      flow: string | null;
      sent: number;
      opened: number;
      clicked: number;
    }>
  >`
    SELECT
      flow,
      COUNT(*)::int AS sent,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked
    FROM public.user_nurture_email_stats
    GROUP BY flow
    ORDER BY sent DESC
  `;

  const sent = totalsRow?.sent ?? 0;
  const opened = totalsRow?.opened ?? 0;
  const clicked = totalsRow?.clicked ?? 0;

  return {
    totals: {
      sent,
      opened,
      clicked,
      openRate: rate(opened, sent),
      clickRate: rate(clicked, sent),
    },
    byStage: byStage.map((row) => ({
      stageId: row.stage_id ?? "unknown",
      stageLabel: row.stage_label ?? row.stage_id ?? "Unknown stage",
      flow: row.flow ?? "unknown",
      sent: row.sent,
      opened: row.opened,
      clicked: row.clicked,
      openRate: rate(row.opened, row.sent),
      clickRate: rate(row.clicked, row.sent),
    })),
    byFlow: byFlow.map((row) => ({
      flow: row.flow ?? "unknown",
      sent: row.sent,
      opened: row.opened,
      clicked: row.clicked,
      openRate: rate(row.opened, row.sent),
      clickRate: rate(row.clicked, row.sent),
    })),
  };
}
