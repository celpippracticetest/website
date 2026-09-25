const DB_NAME = "celpip-guest-mock";
const DB_VERSION = 1;
const STORE = "answers";

export type GuestMockAnswer =
  | {
      id: string;
      kind: "objective";
      examId: string;
      attemptId: string;
      partId: number;
      answers: Record<string, string>;
    }
  | {
      id: string;
      kind: "writing";
      examId: string;
      attemptId: string;
      partId: number;
      text: string;
    }
  | {
      id: string;
      kind: "speaking";
      examId: string;
      attemptId: string;
      partId: number;
      audio: Blob;
    };

function partKey(
  examId: string,
  attemptId: string,
  kind: GuestMockAnswer["kind"],
  partId: number,
) {
  return `${examId}:${attemptId || "none"}:${kind}:${partId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("examId", "examId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putAnswer(record: GuestMockAnswer): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export function saveGuestObjectiveAnswer(input: {
  examId: string;
  attemptId?: string;
  partId: number;
  answers: Record<string, string>;
}) {
  const attemptId = input.attemptId || "none";
  return putAnswer({
    id: partKey(input.examId, attemptId, "objective", input.partId),
    kind: "objective",
    examId: input.examId,
    attemptId,
    partId: input.partId,
    answers: input.answers,
  });
}

export function saveGuestWritingAnswer(input: {
  examId: string;
  attemptId?: string;
  partId: number;
  text: string;
}) {
  const attemptId = input.attemptId || "none";
  return putAnswer({
    id: partKey(input.examId, attemptId, "writing", input.partId),
    kind: "writing",
    examId: input.examId,
    attemptId,
    partId: input.partId,
    text: input.text,
  });
}

export function saveGuestSpeakingAnswer(input: {
  examId: string;
  attemptId?: string;
  partId: number;
  audio: Blob;
}) {
  const attemptId = input.attemptId || "none";
  return putAnswer({
    id: partKey(input.examId, attemptId, "speaking", input.partId),
    kind: "speaking",
    examId: input.examId,
    attemptId,
    partId: input.partId,
    audio: input.audio,
  });
}

export function listGuestMockAnswers(examId: string): Promise<GuestMockAnswer[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).index("examId").getAll(examId);
        req.onsuccess = () => {
          db.close();
          resolve((req.result as GuestMockAnswer[]) ?? []);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      }),
  );
}

function deleteGuestMockAnswer(id: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

const claimInflight = new Map<string, Promise<{ uploaded: number; remaining: number }>>();

async function uploadGuestAnswer(answer: GuestMockAnswer): Promise<boolean> {
  const attemptId = answer.attemptId === "none" ? undefined : answer.attemptId;
  if (answer.kind === "objective") {
    const response = await fetch("/api/exams/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: answer.examId,
        partId: answer.partId,
        answers: answer.answers,
        attemptId,
      }),
    });
    return response.ok;
  }
  if (answer.kind === "writing") {
    const response = await fetch("/api/exams/answers/writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: answer.examId,
        partId: answer.partId,
        text: answer.text,
        attemptId,
      }),
    });
    return response.ok;
  }
  const formData = new FormData();
  formData.append("audio", answer.audio, "recording.m4a");
  formData.append("examId", answer.examId);
  formData.append("partId", String(answer.partId));
  formData.append("attemptId", attemptId || "");
  const response = await fetch("/api/exams/answers/speaking", {
    method: "POST",
    body: formData,
  });
  return response.ok;
}

async function claimGuestMockAnswersOnce(examId: string) {
  const pending = await listGuestMockAnswers(examId);
  const objective = pending.filter((item) => item.kind === "objective");
  const scored = pending.filter((item) => item.kind !== "objective");
  let uploaded = 0;

  await Promise.all(
    objective.map(async (item) => {
      if (await uploadGuestAnswer(item)) {
        await deleteGuestMockAnswer(item.id);
        uploaded += 1;
      }
    }),
  );

  for (const item of scored) {
    if (await uploadGuestAnswer(item)) {
      await deleteGuestMockAnswer(item.id);
      uploaded += 1;
    }
  }

  const remaining = (await listGuestMockAnswers(examId)).length;
  return { uploaded, remaining };
}

/** Send on-device answers for this exam to the signed-in user, then drop the saved copies. */
export function claimGuestMockAnswers(examId: string) {
  const existing = claimInflight.get(examId);
  if (existing) return existing;
  const job = claimGuestMockAnswersOnce(examId).finally(() => {
    claimInflight.delete(examId);
  });
  claimInflight.set(examId, job);
  return job;
}
