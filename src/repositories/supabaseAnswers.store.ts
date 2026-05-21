import "server-only";

import { ObjectId } from "bson";
import {
  ListeningAndReadingAnswerDto,
  WritingAnswerDto,
  type TListeningAndReadingAnswerDto,
  type TWritingAnswerDto,
  writingAnswerDtoFromLeanDocument,
} from "@/models/answer";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const HEX24 = /^[a-f0-9]{24}$/i;

export type AnswerRow = {
  id: string;
  legacy_mongo_id: string | null;
  user_id: string;
  practice_id: string | null;
  task_id: string | null;
  type: string;
  answers: Record<string, string> | null;
  exam_id: string | null;
  part_id: number | null;
  attempt_id: string | null;
  attempt_key: string;
  text: string | null;
  audio_url: string | null;
  overall_score: number | null;
  result: unknown;
  created_at: string;
  updated_at: string;
};

function attemptKeyFromDto(attemptId: string | null | undefined): string {
  if (attemptId == null || attemptId === "") return "";
  return attemptId;
}

export function normalizeExamIdForStorage(examId: string | undefined): string | undefined {
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

function writingDtoFromAnswerRow(row: AnswerRow): TWritingAnswerDto {
  const id =
    row.legacy_mongo_id && HEX24.test(row.legacy_mongo_id)
      ? row.legacy_mongo_id.toLowerCase()
      : row.id;
  const t = String(row.type ?? "").toUpperCase();
  return WritingAnswerDto.parse({
    id,
    userId: row.user_id,
    text: row.text ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    practiceId: row.practice_id ?? undefined,
    examId: row.exam_id ?? undefined,
    partId: row.part_id ?? undefined,
    overalScore: row.overall_score ?? undefined,
    attemptId: row.attempt_id ?? undefined,
    type: t === "SPEAKING" ? "SPEAKING" : "WRITING",
    result: row.result as TWritingAnswerDto["result"],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

function rowToListeningDto(row: AnswerRow): TListeningAndReadingAnswerDto {
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
    .from("answers")
    .select("*")
    .eq("user_id", userId)
    .eq("practice_id", practiceId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToListeningDto(data as AnswerRow);
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

  let existing: AnswerRow | null = null;

  if (dto.attemptId && examId != null && dto.partId != null) {
    const { data } = await admin
      .from("answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("exam_id", examId)
      .eq("part_id", dto.partId)
      .eq("attempt_key", attemptKey)
      .is("practice_id", null)
      .maybeSingle();
    existing = (data as AnswerRow | null) ?? null;
  } else if (dto.practiceId) {
    const { data } = await admin
      .from("answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("practice_id", dto.practiceId)
      .maybeSingle();
    existing = (data as AnswerRow | null) ?? null;
  } else if (examId != null && dto.partId != null) {
    const { data } = await admin
      .from("answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("exam_id", examId)
      .eq("part_id", dto.partId)
      .eq("attempt_key", attemptKey)
      .is("practice_id", null)
      .maybeSingle();
    existing = (data as AnswerRow | null) ?? null;
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
      .from("answers")
      .update(basePayload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update answers row.");
    }
    return rowToListeningDto(data as AnswerRow);
  }

  const insertPayload = {
    ...basePayload,
    created_at: (dto.createdAt ?? new Date()).toISOString(),
  };

  const { data, error } = await admin
    .from("answers")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to insert answers row.");
  }
  return rowToListeningDto(data as AnswerRow);
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
    .from("answers")
    .select("practice_id")
    .eq("user_id", userId)
    .eq("task_id", wantHex);

  if (error || !data?.length) return [];

  const out: string[] = [];
  for (const row of data as Pick<AnswerRow, "practice_id">[]) {
    if (row.practice_id) out.push(row.practice_id);
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
    .from("answers")
    .select("*")
    .eq("user_id", userId)
    .in("exam_id", variants)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

  const items: TListeningAndReadingAnswerDto[] = [];
  for (const row of data as AnswerRow[]) {
    const t = String(row.type ?? "").toUpperCase();
    if (t === "SPEAKING" || t === "WRITING") continue;
    try {
      items.push(rowToListeningDto(row));
    } catch {
      /* skip malformed */
    }
  }
  return items;
}

async function supabaseListWritingSpeakingByExamIds(
  userId: string,
  examIds: string[]
): Promise<TWritingAnswerDto[]> {
  const admin = getSupabaseAdmin();
  if (!admin || examIds.length === 0) return [];

  const variants = examIdMatchList(examIds);
  if (variants.length === 0) return [];

  const { data, error } = await admin
    .from("answers")
    .select("*")
    .eq("user_id", userId)
    .in("exam_id", variants)
    .in("type", ["WRITING", "SPEAKING"])
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

  const out: TWritingAnswerDto[] = [];
  for (const row of data as AnswerRow[]) {
    try {
      out.push(writingDtoFromAnswerRow(row));
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function supabaseGetPartitionedMockExamProgressAnswers(
  userId: string,
  examIds: string[],
  _fetchWritingSpeakingFromLegacy: () => Promise<unknown[]>
): Promise<{
  listeningAndReading: TListeningAndReadingAnswerDto[];
  writingAndSpeaking: TWritingAnswerDto[];
  fetchedCount: number;
}> {
  const lr = await supabaseListListeningReadingByExamIds(userId, examIds);
  const wsFromSb = await supabaseListWritingSpeakingByExamIds(userId, examIds);
  const rawWs = await _fetchWritingSpeakingFromLegacy();
  const writingAndSpeakingLegacy = rawWs
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

  const wsMap = new Map<string, TWritingAnswerDto>();
  for (const w of writingAndSpeakingLegacy) {
    wsMap.set(writingWsDedupeKey(w), w);
  }
  for (const w of wsFromSb) {
    wsMap.set(writingWsDedupeKey(w), w);
  }
  const writingAndSpeaking = [...wsMap.values()];

  return {
    listeningAndReading: lr,
    writingAndSpeaking,
    fetchedCount: lr.length + writingAndSpeaking.length,
  };
}

function writingWsDedupeKey(w: TWritingAnswerDto): string {
  if (w.practiceId) return `p:${w.userId}:${w.practiceId}`;
  return `e:${w.userId}:${normalizeExamIdForStorage(w.examId) ?? ""}:${w.partId ?? ""}:${w.attemptId ?? ""}`;
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
    .from("answers")
    .select("*")
    .eq("user_id", userId)
    .in("exam_id", variants)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { items: [], page: 0, totalItems: 0, totalPages: 0, hasNextPage: false };
  }

  const filtered = (data as AnswerRow[]).filter((row) => {
    const t = String(row.type ?? "").toUpperCase();
    return t !== "SPEAKING" && t !== "WRITING";
  });

  const totalItems = filtered.length;
  const slice = filtered.slice(skip, skip + limit);
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

  return {
    items: slice.map((r) => rowToListeningDto(r)),
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
    .from("answers")
    .select("*")
    .eq("user_id", userId)
    .in("exam_id", variants);

  if (error || !data?.length) return [];

  return (data as AnswerRow[])
    .filter((row) => Object.keys(row.answers ?? {}).length > 0)
    .map((row) => ({
      ...rowToListeningDto(row),
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
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  if (isUuidRowId(id)) {
    const { data, error } = await admin
      .from("answers")
      .select("*")
      .eq("id", id.trim())
      .maybeSingle();
    if (!error && data) return rowToListeningDto(data as AnswerRow);
  }

  const trimmed = id.trim();
  if (HEX24.test(trimmed)) {
    const { data, error } = await admin
      .from("answers")
      .select("*")
      .eq("legacy_mongo_id", trimmed.toLowerCase())
      .maybeSingle();
    if (!error && data) return rowToListeningDto(data as AnswerRow);
  }

  return null;
}

export async function supabaseUpdateAnswer(
  id: string,
  dto: Omit<Partial<TListeningAndReadingAnswerDto>, "id">
): Promise<TListeningAndReadingAnswerDto | null> {
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

  if (isUuidRowId(id)) {
    const { data, error } = await admin
      .from("answers")
      .update(patch)
      .eq("id", id.trim())
      .select("*")
      .maybeSingle();
    if (!error && data) return rowToListeningDto(data as AnswerRow);
  }

  const trimmed = id.trim();
  if (HEX24.test(trimmed)) {
    const { data, error } = await admin
      .from("answers")
      .update(patch)
      .eq("legacy_mongo_id", trimmed.toLowerCase())
      .select("*")
      .maybeSingle();
    if (!error && data) return rowToListeningDto(data as AnswerRow);
  }

  return null;
}

export async function supabaseDeleteAnswer(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  if (isUuidRowId(id)) {
    await admin.from("answers").delete().eq("id", id.trim());
    return;
  }
  const trimmed = id.trim();
  if (HEX24.test(trimmed)) {
    await admin.from("answers").delete().eq("legacy_mongo_id", trimmed.toLowerCase());
  }
}

/** All answer rows for a user (user scores, hybrid reads). */
export async function supabaseListAllAnswersForUser(
  userId: string
): Promise<Record<string, unknown>[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("answers")
    .select(
      "user_id, type, practice_id, exam_id, part_id, answers, text, audio_url, overall_score, result, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

  return (data as AnswerRow[]).map((row) => answerRowToUserScoresDoc(row));
}

function answerRowToUserScoresDoc(row: AnswerRow): Record<string, unknown> {
  const examRaw = row.exam_id ?? undefined;
  const practiceId = row.practice_id ?? undefined;
  return {
    type: row.type,
    userId: row.user_id,
    practiceId,
    examId: examRaw,
    partId: row.part_id ?? undefined,
    answers: row.answers ?? {},
    text: row.text ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    overalScore: row.overall_score ?? undefined,
    result: row.result ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function supabaseFindWritingAnswerById(id: string): Promise<TWritingAnswerDto | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  let row: AnswerRow | null = null;
  if (isUuidRowId(id)) {
    const { data, error } = await admin
      .from("answers")
      .select("*")
      .eq("id", id.trim())
      .maybeSingle();
    if (!error && data) row = data as AnswerRow;
  }
  if (!row) {
    const trimmed = id.trim();
    if (HEX24.test(trimmed)) {
      const { data, error } = await admin
        .from("answers")
        .select("*")
        .eq("legacy_mongo_id", trimmed.toLowerCase())
        .maybeSingle();
      if (!error && data) row = data as AnswerRow;
    }
  }
  if (!row) return null;
  try {
    return writingDtoFromAnswerRow(row);
  } catch {
    return null;
  }
}

export async function supabaseCreateOrUpdateWritingAnswer(
  dto: Omit<TWritingAnswerDto, "id">
): Promise<TWritingAnswerDto> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const examId = normalizeExamIdForStorage(dto.examId);
  const attemptKey = attemptKeyFromDto(dto.attemptId);

  let existing: AnswerRow | null = null;

  if (dto.attemptId && examId != null && dto.partId != null) {
    const { data } = await admin
      .from("answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("exam_id", examId)
      .eq("part_id", dto.partId)
      .eq("attempt_key", attemptKey)
      .is("practice_id", null)
      .maybeSingle();
    existing = (data as AnswerRow | null) ?? null;
  } else if (dto.practiceId) {
    const { data } = await admin
      .from("answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("practice_id", dto.practiceId)
      .maybeSingle();
    existing = (data as AnswerRow | null) ?? null;
  } else if (examId != null && dto.partId != null) {
    const { data } = await admin
      .from("answers")
      .select("*")
      .eq("user_id", dto.userId)
      .eq("exam_id", examId)
      .eq("part_id", dto.partId)
      .eq("attempt_key", attemptKey)
      .is("practice_id", null)
      .maybeSingle();
    existing = (data as AnswerRow | null) ?? null;
  }

  const typeUpper = String(dto.type ?? "WRITING").toUpperCase();
  const basePayload = {
    user_id: dto.userId,
    practice_id: dto.practiceId ?? null,
    exam_id: examId ?? null,
    part_id: dto.partId ?? null,
    attempt_id: dto.attemptId ?? null,
    attempt_key: attemptKey,
    type: typeUpper === "SPEAKING" ? "SPEAKING" : "WRITING",
    answers: {} as Record<string, string>,
    text: dto.text ?? null,
    audio_url: dto.audioUrl ?? null,
    overall_score: dto.overalScore ?? null,
    result: dto.result ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await admin
      .from("answers")
      .update(basePayload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update writing answers row.");
    }
    return writingDtoFromAnswerRow(data as AnswerRow);
  }

  const { data, error } = await admin
    .from("answers")
    .insert({
      ...basePayload,
      created_at: (dto.createdAt ?? new Date()).toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to insert writing answers row.");
  }
  return writingDtoFromAnswerRow(data as AnswerRow);
}

export async function supabaseGetAllWritingAnswers(
  filter: Partial<TWritingAnswerDto>,
  page: number,
  limit: number
): Promise<{
  items: TWritingAnswerDto[];
  hasNextPage: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { items: [], page: 0, totalItems: 0, totalPages: 0, hasNextPage: false };
  }

  const skip = page * limit;
  const userIdVal = typeof filter.userId === "string" ? filter.userId : null;
  const examRaw =
    typeof filter.examId === "string" ? filter.examId : undefined;
  const examVariants = examRaw ? examIdMatchList([examRaw]) : [];
  const typeVal = typeof filter.type === "string" ? filter.type.toUpperCase() : null;
  const partIdVal = typeof filter.partId === "number" ? filter.partId : null;
  const practiceIdVal =
    typeof filter.practiceId === "string" && filter.practiceId.length > 0
      ? filter.practiceId
      : null;

  let q = admin
    .from("answers")
    .select("*", { count: "exact" })
    .in("type", typeVal ? [typeVal] : ["WRITING", "SPEAKING"])
    .order("created_at", { ascending: false });

  if (userIdVal) q = q.eq("user_id", userIdVal);
  if (examVariants.length === 1) {
    q = q.eq("exam_id", examVariants[0]);
  } else if (examVariants.length > 1) {
    q = q.in("exam_id", examVariants);
  }
  if (partIdVal != null) q = q.eq("part_id", partIdVal);
  if (practiceIdVal) q = q.eq("practice_id", practiceIdVal);
  if ("attemptId" in filter) {
    q = q.eq("attempt_key", attemptKeyFromDto(filter.attemptId));
  }

  const { data, error, count } = await q.range(skip, skip + limit - 1);

  if (error || !data) {
    return { items: [], page: 0, totalItems: 0, totalPages: 0, hasNextPage: false };
  }

  const totalItems = count ?? 0;
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
  const items: TWritingAnswerDto[] = [];
  for (const row of data as AnswerRow[]) {
    try {
      items.push(writingDtoFromAnswerRow(row));
    } catch {
      /* skip */
    }
  }

  return {
    items,
    page,
    totalItems,
    totalPages,
    hasNextPage: skip + items.length < totalItems,
  };
}

export async function supabaseUpdateWritingAnswer(
  id: string,
  dto: Omit<Partial<TWritingAnswerDto>, "id">
): Promise<TWritingAnswerDto | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (dto.text !== undefined) patch.text = dto.text ?? null;
  if (dto.audioUrl !== undefined) patch.audio_url = dto.audioUrl ?? null;
  if (dto.overalScore !== undefined) patch.overall_score = dto.overalScore ?? null;
  if (dto.result !== undefined) patch.result = dto.result ?? null;
  if (dto.type !== undefined) patch.type = String(dto.type).toUpperCase();
  if (dto.practiceId !== undefined) patch.practice_id = dto.practiceId ?? null;
  if (dto.examId !== undefined) patch.exam_id = normalizeExamIdForStorage(dto.examId) ?? null;
  if (dto.partId !== undefined) patch.part_id = dto.partId ?? null;
  if (dto.attemptId !== undefined) {
    patch.attempt_id = dto.attemptId ?? null;
    patch.attempt_key = attemptKeyFromDto(dto.attemptId);
  }

  let row: AnswerRow | null = null;
  if (isUuidRowId(id)) {
    const { data, error } = await admin
      .from("answers")
      .update(patch)
      .eq("id", id.trim())
      .select("*")
      .maybeSingle();
    if (!error && data) row = data as AnswerRow;
  }
  if (!row) {
    const trimmed = id.trim();
    if (HEX24.test(trimmed)) {
      const { data, error } = await admin
        .from("answers")
        .update(patch)
        .eq("legacy_mongo_id", trimmed.toLowerCase())
        .select("*")
        .maybeSingle();
      if (!error && data) row = data as AnswerRow;
    }
  }
  if (!row) return null;
  try {
    return writingDtoFromAnswerRow(row);
  } catch {
    return null;
  }
}

export async function supabaseDeleteWritingAnswer(id: string): Promise<void> {
  await supabaseDeleteAnswer(id);
}

export async function supabaseFindCompletedPracticeIdsByTaskAndUser(
  taskId: string,
  userId: string,
  type: "SPEAKING" | "WRITING"
): Promise<string[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const wantHex =
    typeof taskId === "string" && HEX24.test(taskId) ? taskId.toLowerCase() : null;
  if (!wantHex) return [];

  const { data, error } = await admin
    .from("answers")
    .select("practice_id")
    .eq("user_id", userId)
    .eq("task_id", wantHex)
    .eq("type", type);

  if (error || !data?.length) return [];

  const seen = new Set<string>();
  for (const row of data as Pick<AnswerRow, "practice_id">[]) {
    if (row.practice_id) seen.add(row.practice_id);
  }
  return [...seen];
}

export async function supabaseFindPracticeIdsWithWritingAnswers(
  practiceIds: string[],
  userId: string
): Promise<string[]> {
  const admin = getSupabaseAdmin();
  if (!admin || practiceIds.length === 0) return [];

  const { data, error } = await admin
    .from("answers")
    .select("practice_id")
    .eq("user_id", userId)
    .in("practice_id", practiceIds)
    .in("type", ["WRITING", "SPEAKING"]);

  if (error || !data?.length) return [];

  const seen = new Set<string>();
  for (const row of data as Pick<AnswerRow, "practice_id">[]) {
    if (row.practice_id) seen.add(row.practice_id);
  }
  return [...seen];
}
