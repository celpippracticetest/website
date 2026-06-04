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

export async function recordNurtureEmailEvent(input: {
  svixId: string;
  eventType: NurtureEmailEventType;
  resendMessageId: string;
  occurredAt: Date;
  tags?: Record<string, string | undefined>;
}): Promise<{ recorded: boolean; updatedStat: boolean }> {
  const db = await getDb();
  const eventsCollection = db.collection(NURTURE_EVENTS_COLLECTION);
  const metricsCollection = db.collection(NURTURE_METRICS_COLLECTION);

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

  let stat = await metricsCollection.findOne({ resendMessageId: input.resendMessageId });

  const userId = input.tags?.user_id?.trim();
  const stageId = input.tags?.stage_id?.trim();
  if (!stat && userId && stageId) {
    const matches = await metricsCollection
      .find({ userId, stageId })
      .sort({ sentAt: -1 })
      .limit(1)
      .toArray();
    stat = matches[0] ?? null;
  }

  if (!stat?._id) {
    return { recorded: true, updatedStat: false };
  }

  const isOpen = input.eventType === "opened";
  const firstField = isOpen ? "openedAt" : "clickedAt";
  const lastField = isOpen ? "lastOpenedAt" : "lastClickedAt";
  const countField = isOpen ? "openCount" : "clickCount";
  const existing = stat as Record<string, unknown>;

  const setFields: Record<string, unknown> = { [lastField]: input.occurredAt };
  if (!existing[firstField]) {
    setFields[firstField] = input.occurredAt;
  }
  if (!existing.resendMessageId) {
    setFields.resendMessageId = input.resendMessageId;
  }

  await metricsCollection.updateOne(
    { _id: stat._id },
    {
      $set: setFields,
      $inc: { [countField]: 1 },
    }
  );

  return { recorded: true, updatedStat: true };
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
