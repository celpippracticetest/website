import { NextRequest, NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import { getResendClient, sendResendHtmlEmail } from "@/lib/email/resend-client";
import {
  buildNurtureEmailConfigWithDefaults,
  NURTURE_EMAIL_CONFIG_COLLECTION,
  NURTURE_EMAIL_CONFIG_KEY,
  type NurtureEmailConfigInput,
  type NurtureTriggerType,
} from "@/lib/nurture-email/config";
import {
  buildNurtureMergeFields,
  renderNurtureEmail,
  resolveNurtureSiteOrigin,
} from "@/lib/nurture-email/merge-fields";
import {
  findNextNurtureStage,
  hasElapsedHours,
  toDate,
} from "@/lib/nurture-email/stage-scheduler";
import { listNurtureCandidates } from "@/lib/nurture-email/candidates";
import {
  NURTURE_EMAIL_KIND,
  NURTURE_METRICS_COLLECTION,
} from "@/lib/nurture-email/metrics";

const NURTURE_STATE_COLLECTION = "usernurturestates";
const NURTURE_LOCK_COLLECTION = "usernurtureemaildispatchlocks";

type ResolvedNurture = {
  userId: string;
  flow: NurtureTriggerType;
  stageId: string;
  stageLabel: string;
  subject: string;
  htmlBody: string;
  nurtureWindowStartedAt?: Date;
  nurturesInWindow: number;
};

function isAuthorizedCron(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const secret = process.env.CRON_SECRET;

  return Boolean(
    (authHeader && secret && authHeader === `Bearer ${secret}`) ||
      (token && secret && token === secret)
  );
}

async function getNurtureEmailConfig(): Promise<NurtureEmailConfigInput> {
  const db = await getDb();
  const configCollection = db.collection(NURTURE_EMAIL_CONFIG_COLLECTION);
  const doc = await configCollection.findOne({ configKey: NURTURE_EMAIL_CONFIG_KEY });
  return buildNurtureEmailConfigWithDefaults(doc?.config || null);
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const nurtureConfig = await getNurtureEmailConfig();
    const stages = nurtureConfig.stages.filter((s) => s.enabled);

    if (stages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No enabled nurture stages.",
        sent: 0,
      });
    }

    const candidates = await listNurtureCandidates(1500);
    const db = await getDb();
    const stateCollection = db.collection(NURTURE_STATE_COLLECTION);
    const metricsCollection = db.collection(NURTURE_METRICS_COLLECTION);
    const lockCollection = db.collection<{
      _id: string;
      userId: string;
      claimKey: string;
      createdAt: Date;
    }>(NURTURE_LOCK_COLLECTION);
    const cc = await appUserAdmin();
    const siteOrigin = resolveNurtureSiteOrigin();

    const queue: ResolvedNurture[] = [];

    for (const candidate of candidates) {
      const next = findNextNurtureStage(candidate, stages, now);
      if (!next) continue;

      queue.push({
        userId: candidate.userId,
        flow: next.flow,
        stageId: next.stage.id,
        stageLabel: next.stage.label,
        subject: next.stage.subject,
        htmlBody: next.stage.htmlBody,
        nurtureWindowStartedAt: toDate(candidate.nurtureWindowStartedAt),
        nurturesInWindow: candidate.nurturesInWindow ?? 0,
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let attempted = 0;
    const stageCounters: Record<string, number> = {};
    const flowCounters: Record<string, number> = {
      signup: 0,
      free_user_active: 0,
      inactive_free: 0,
    };

    for (const item of queue) {
      attempted += 1;

      try {
        const claimKey = `nurture:${item.flow}:${item.stageId}:${now.toISOString().slice(0, 13)}`;
        try {
          await lockCollection.insertOne({
            _id: `${item.userId}:${claimKey}`,
            userId: item.userId,
            claimKey,
            createdAt: now,
          });
        } catch {
          skipped += 1;
          continue;
        }

        const user = await cc.users.getUser(item.userId);
        const primaryEmail =
          user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
          user.emailAddresses[0]?.emailAddress;

        if (!primaryEmail) {
          skipped += 1;
          continue;
        }

        if (!item.subject?.trim() || !item.htmlBody?.trim()) {
          console.error(
            `[nurture-email] Missing subject/htmlBody for stage ${item.stageId}, user ${item.userId}`
          );
          skipped += 1;
          continue;
        }

        if (!getResendClient()) {
          console.error("[nurture-email] RESEND_API_KEY is not configured; skipping send.");
          skipped += 1;
          continue;
        }

        const u = user as { firstName?: unknown; username?: unknown };
        const firstName =
          (typeof u.firstName === "string" ? u.firstName.trim() : "") ||
          (typeof u.username === "string" ? u.username.trim() : "") ||
          primaryEmail.split("@")[0] ||
          "there";

        const mergeFields = buildNurtureMergeFields({
          firstName,
          email: primaryEmail,
          siteOrigin,
        });
        const { subject, html } = renderNurtureEmail(item.subject, item.htmlBody, mergeFields);

        const { id: resendMessageId } = await sendResendHtmlEmail({
          to: primaryEmail,
          subject,
          html,
          tags: [
            { name: "email_kind", value: NURTURE_EMAIL_KIND },
            { name: "user_id", value: item.userId },
            { name: "stage_id", value: item.stageId },
            { name: "flow", value: item.flow },
          ],
        });

        const windowStart = toDate(item.nurtureWindowStartedAt);
        const isWindowActive = windowStart && !hasElapsedHours(windowStart, now, 720);
        const nextWindowStartedAt = isWindowActive ? windowStart : now;
        const nextNurturesInWindow = isWindowActive ? item.nurturesInWindow + 1 : 1;

        await stateCollection.updateOne(
          { userId: item.userId },
          {
            $set: {
              userId: item.userId,
              lastNurtureSentAt: now,
              nurtureFlow: item.flow,
              nurtureStageId: item.stageId,
              nurtureWindowStartedAt: nextWindowStartedAt,
              nurturesInWindow: nextNurturesInWindow,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        );

        await metricsCollection.insertOne({
          userId: item.userId,
          flow: item.flow,
          stageId: item.stageId,
          stageLabel: item.stageLabel,
          emailProvider: "resend",
          resendMessageId,
          subject: item.subject,
          sentAt: now,
          createdAt: now,
          openCount: 0,
          clickCount: 0,
        });

        stageCounters[item.stageLabel] = (stageCounters[item.stageLabel] || 0) + 1;
        flowCounters[item.flow] = (flowCounters[item.flow] || 0) + 1;
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("[nurture-email] send failed for user:", item.userId, error);
      }
    }

    return NextResponse.json({
      success: true,
      audience: nurtureConfig.audience,
      totalCandidates: candidates.length,
      nurturesQueued: queue.length,
      attempted,
      sent,
      skipped,
      failed,
      flowCounters,
      stageCounters,
    });
  } catch (error) {
    console.error("[nurture-email] cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
