import { getSql } from "@/lib/pg/pool";

export type LearningReminderState = {
  userId: string;
  lastReminderSentAt: Date | null;
  remindersInWindow: number;
  lastEngagedAt: Date | null;
};

type ReminderRow = {
  user_id: string;
  last_reminder_sent_at: Date | null;
  reminders_in_window: number;
  last_engaged_at: Date | null;
};

function mapRow(row: ReminderRow): LearningReminderState {
  return {
    userId: row.user_id,
    lastReminderSentAt: row.last_reminder_sent_at,
    remindersInWindow: row.reminders_in_window,
    lastEngagedAt: row.last_engaged_at,
  };
}

export async function getLearningReminderState(
  userId: string
): Promise<LearningReminderState | null> {
  const sql = getSql();
  const rows = await sql<ReminderRow[]>`
    SELECT user_id, last_reminder_sent_at, reminders_in_window, last_engaged_at
    FROM public.user_learning_reminders
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function getLearningReminderStatesByUserIds(
  userIds: string[]
): Promise<Map<string, LearningReminderState>> {
  if (userIds.length === 0) return new Map();
  const sql = getSql();
  const rows = await sql<ReminderRow[]>`
    SELECT user_id, last_reminder_sent_at, reminders_in_window, last_engaged_at
    FROM public.user_learning_reminders
    WHERE user_id = ANY(${userIds})
  `;
  const map = new Map<string, LearningReminderState>();
  for (const row of rows) {
    map.set(row.user_id, mapRow(row));
  }
  return map;
}

export async function recordLearningReminderSent(userId: string): Promise<void> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO public.user_learning_reminders (
      user_id, last_reminder_sent_at, reminders_in_window, updated_at
    ) VALUES (
      ${userId}, ${now}, 1, ${now}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      last_reminder_sent_at = EXCLUDED.last_reminder_sent_at,
      reminders_in_window = public.user_learning_reminders.reminders_in_window + 1,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function touchLearningEngaged(userId: string): Promise<void> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO public.user_learning_reminders (
      user_id, last_engaged_at, updated_at
    ) VALUES (
      ${userId}, ${now}, ${now}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      last_engaged_at = EXCLUDED.last_engaged_at,
      updated_at = EXCLUDED.updated_at
  `;
}
