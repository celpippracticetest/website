import "server-only";

import { ObjectId } from "bson";
import {
  ListeningAndReadingAnswerDto,
  type TListeningAndReadingAnswerDto,
  type TWritingAnswerDto,
} from "@/models/answer";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { writingAnswerDtoFromLeanDocument } from "@/repositories/writingAndSpeakingAnswers.repo";
const HEX24 = /^[a-f0-9]{24}$/i;

type UserPracticeAnswerRow = {
  id: string;
  user_id: string;
  practice_id: string | null;
  task_id: string | null;
  type: string;
  answers: Record<string, string> | null;
  exam_id: string | null;
  part_id: number | null;
  attempt_id: string | null;
  attempt_key: string;
  created_at: string;
  updated_at: string;
};

function attemptKeyFromDto(attemptId: string | null | undefined): string {
  if (attemptId == null || attemptId === "") return "";
  return attemptId;
}

function normalizeExamIdForStorage(examId: string | undefined): string | undefined {
  if (examId == null || examId === "") return undefined;
  const t = examId.trim();
  if (HEX24.test(t)) return t.toLowerCase();
  return t;
}

function examIdMatchList(examIds: string[]): string[] {
  const out = new Set<string>();
  for (const id of examIds) {
    const t = id.trim();
    if (!t) continue;
    out.add(t);
    if (HEX24.test(t)) out.add(t.toLowerCase());
  }
  return [...out];
}

function optionalIdString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof ObjectId) return value.toHexString().toLowerCase();
  return undefined;
}

function rowToDto(row: UserPracticeAnswerRow): TListeningAndReadingAnswerDto {
  const answers = (row.answers ?? {}) as Record<string, string>;
  return ListeningAndReadingAnswerDto.parse({
    id: row.id,
    answers,
    userId: row.user_id,
    practiceId: row.practice_id ?? undefined,
    taskId: optionalIdString(row.task_id),
    examId: row.exam_id ?? undefined,
    partId: row.part_id ?? undefined,
    attemptId: row.attempt_id ?? undefined,
    type: row.type as TListeningAndReadingAnswerDto["type"],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

function isUuidRowId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim()
  );
}

export async function supabaseFindAnswerByPracticeAndUser(
  practiceId: string,
  userId: string
): Promise<TListeningAndReadingAnswerDto | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("user_practice_answers")
    .select("*")
    .eq("user_id", userId)
    .eq("practice_id", practiceId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToDto(data as UserPracticeAnswerRow);
}

export async function supabaseCreateOrUpdateAnswer(
  dto: Omit<TListeningAndReadingAnswerDto, "id">
): Promise<TListeningAndReadingAnswerDto> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const examId = normalizeExamIdForStorage(dto.examId);
  const attemptKey = attemptKeyFromDto(dto.attemptId);

  let existing: UserPracticeAnswerRow | null = null;

  if (dto.attemptId && examId != null && dto.partId != null) {
    const { data } = await admin
      .from("user_practice_answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("exam_id", examId)
      .eq("part_id", dto.partId)
      .eq("attempt_key", attemptKey)
      .is("practice_id", null)
      .maybeSingle();
    existing = (data as UserPracticeAnswerRow | null) ?? null;
  } else if (dto.practiceId) {
    const { data } = await admin
      .from("user_practice_answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("practice_id", dto.practiceId)
      .maybeSingle();
    existing = (data as UserPracticeAnswerRow | null) ?? null;
  } else if (examId != null && dto.partId != null) {
    const { data } = await admin
      .from("user_practice_answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("exam_id", examId)
      .eq("part_id", dto.partId)
      .eq("attempt_key", attemptKey)
      .is("practice_id", null)
      .maybeSingle();
    existing = (data as UserPracticeAnswerRow | null) ?? null;
  }

  const basePayload = {
    user_id: dto.userId,
    practice_id: dto.practiceId ?? null,
    task_id: dto.taskId ?? null,
    type: String(dto.type ?? "LISTENING").toUpperCase(),
    answers: dto.answers ?? {},
    exam_id: examId ?? null,
    part_id: dto.partId ?? null,
    attempt_id: dto.attemptId ?? null,
    attempt_key: attemptKey,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await admin
      .from("user_practice_answers")
      .update(basePayload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update user_practice_answers row.");
    }
    return rowToDto(data as UserPracticeAnswerRow);
  }

  const insertPayload = {
    ...basePayload,
    created_at: (dto.createdAt ?? new Date()).toISOString(),
  };

  const { data, error } = await admin
    .from("user_practice_answers")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to insert user_practice_answers row.");
  }
  return rowToDto(data as UserPracticeAnswerRow);
}

export async function supabaseFindAllTaskIdsByTaskAndUser(
  taskId: string,
  userId: string
): Promise<string[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const wantHex =
    typeof taskId === "string" && HEX24.test(taskId) ? taskId.toLowerCase() : null;
  if (!wantHex) return [];

  const { data, error } = await admin
    .from("user_practice_answers")
    .select("practice_id, task_id")
    .eq("user_id", userId);

  if (error || !data?.length) return [];

  const out: string[] = [];
  for (const row of data as Pick<UserPracticeAnswerRow, "practice_id" | "task_id">[]) {
    if (row.practice_id == null || row.practice_id === "") continue;
    const tid = optionalIdString(row.task_id);
    if (tid === wantHex && row.practice_id) {
      out.push(row.practice_id);
    }
  }
  return out;
}

export async function supabaseListListeningReadingByExamIds(
  userId: string,
  examIds: string[]
): Promise<TListeningAndReadingAnswerDto[]> {
  const admin = getSupabaseAdmin();
  if (!admin || examIds.length === 0) return [];

  const variants = examIdMatchList(examIds);
  if (variants.length === 0) return [];

  const { data, error } = await admin
    .from("user_practice_answers")
    .select("*")
    .eq("user_id", userId)
    .in("exam_id", variants)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

  const items: TListeningAndReadingAnswerDto[] = [];
  for (const row of data as UserPracticeAnswerRow[]) {
    const t = String(row.type ?? "").toUpperCase();
    if (t === "SPEAKING" || t === "WRITING") continue;
    try {
      items.push(rowToDto(row));
    } catch {
      /* skip malformed */
    }
  }
  return items;
}

export async function supabaseGetPartitionedMockExamProgressAnswers(
  userId: string,
  examIds: string[],
  fetchWritingSpeakingFromLegacy: () => Promise<unknown[]>
): Promise<{
  listeningAndReading: TListeningAndReadingAnswerDto[];
  writingAndSpeaking: TWritingAnswerDto[];
  fetchedCount: number;
}> {
  const lr = await supabaseListListeningReadingByExamIds(userId, examIds);
  const rawWs = await fetchWritingSpeakingFromLegacy();
  const writingAndSpeaking = rawWs
    .filter((doc) => {
      const t = String((doc as { type?: string }).type ?? "").toUpperCase();
      return t === "WRITING" || t === "SPEAKING";
    })
    .map((doc) => {
      try {
        return writingAnswerDtoFromLeanDocument(doc as never);
      } catch {
        return null;
      }
    })
    .filter((x): x is TWritingAnswerDto => x != null);

  return {
    listeningAndReading: lr,
    writingAndSpeaking,
    fetchedCount: lr.length + writingAndSpeaking.length,
  };
}

export async function supabaseGetAllListeningAndReadingAnswers(
  userId: string,
  examId: string,
  page: number,
  limit: number
): Promise<{
  items: TListeningAndReadingAnswerDto[];
  hasNextPage: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { items: [], page: 0, totalItems: 0, totalPages: 0, hasNextPage: false };
  }

  const variants = examIdMatchList([examId]);
  const skip = page * limit;

  const { data, error } = await admin
    .from("user_practice_answers")
    .select("*")
    .eq("user_id", userId)
    .in("exam_id", variants)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { items: [], page: 0, totalItems: 0, totalPages: 0, hasNextPage: false };
  }

  const filtered = (data as UserPracticeAnswerRow[]).filter((row) => {
    const t = String(row.type ?? "").toUpperCase();
    return t !== "SPEAKING" && t !== "WRITING";
  });

  const totalItems = filtered.length;
  const slice = filtered.slice(skip, skip + limit);
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

  return {
    items: slice.map((r) => rowToDto(r)),
    page,
    totalItems,
    totalPages,
    hasNextPage: skip + slice.length < totalItems,
  };
}

export async function supabaseFindAnswersByExamIdAndUser(
  examId: string,
  userId: string
): Promise<
  Array<
    Record<string, unknown> & {
      _id: string;
      createdAt?: string;
      updatedAt?: string;
    }
  >
> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const variants = examIdMatchList([examId]);
  const { data, error } = await admin
    .from("user_practice_answers")
    .select("*")
    .eq("user_id", userId)
    .in("exam_id", variants);

  if (error || !data?.length) return [];

  return (data as UserPracticeAnswerRow[])
    .filter((row) => Object.keys(row.answers ?? {}).length > 0)
    .map((row) => ({
      ...rowToDto(row),
      _id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as unknown as Array<
      Record<string, unknown> & { _id: string; createdAt?: string; updatedAt?: string }
    >;
}

export async function supabaseFindAnswerById(
  id: string
): Promise<TListeningAndReadingAnswerDto | null> {
  if (!isUuidRowId(id)) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("user_practice_answers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToDto(data as UserPracticeAnswerRow);
}

export async function supabaseUpdateAnswer(
  id: string,
  dto: Omit<Partial<TListeningAndReadingAnswerDto>, "id">
): Promise<TListeningAndReadingAnswerDto | null> {
  if (!isUuidRowId(id)) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (dto.answers !== undefined) patch.answers = dto.answers;
  if (dto.type !== undefined) patch.type = String(dto.type).toUpperCase();
  if (dto.taskId !== undefined) patch.task_id = dto.taskId ?? null;
  if (dto.practiceId !== undefined) patch.practice_id = dto.practiceId ?? null;
  if (dto.examId !== undefined) patch.exam_id = normalizeExamIdForStorage(dto.examId) ?? null;
  if (dto.partId !== undefined) patch.part_id = dto.partId ?? null;
  if (dto.attemptId !== undefined) {
    patch.attempt_id = dto.attemptId ?? null;
    patch.attempt_key = attemptKeyFromDto(dto.attemptId);
  }

  const { data, error } = await admin
    .from("user_practice_answers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return rowToDto(data as UserPracticeAnswerRow);
}

export async function supabaseDeleteAnswer(id: string): Promise<void> {
  if (!isUuidRowId(id)) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("user_practice_answers").delete().eq("id", id);
}
