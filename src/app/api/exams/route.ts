import mongoClient from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ExamRepository } from "@/repositories/exams.repo";
import { ObjectId } from "bson";

function hasResults(res: any): boolean {
  if (!res) return false;
  if (typeof res.total === "number" && res.total > 0) return true;
  if (Array.isArray(res.items) && res.items.length > 0) return true;
  if (Array.isArray(res.data) && res.data.length > 0) return true;
  if (Array.isArray(res) && res.length > 0) return true;
  return false;
}

export const GET = async function (req: NextRequest) {
  const page: string = req.nextUrl.searchParams.get("page") ?? "0";
  const limit: string = req.nextUrl.searchParams.get("limit") ?? "10";

  const examRepo = new ExamRepository(mongoClient);
  const exams = await examRepo.getAllExam({}, parseInt(page), parseInt(limit));
  return NextResponse.json({ ...exams, filters: {} }, { status: 200 });
};

export const DELETE = async function (req: NextRequest) {
  try {
    const body = await req.json();
    if (!body._id || typeof body._id !== "string") {
      return NextResponse.json({ error: "_id is required" }, { status: 400 });
    }
    const id = new ObjectId(body._id);
    const examRepo = new ExamRepository(mongoClient);

    let deleted: any;
    try {
      deleted = await examRepo.deleteExam({ _id: id });
    } catch (e) {
      console.error("deleteExam failed", e);
      return NextResponse.json(
        { error: "Failed to delete exam" },
        { status: 500 }
      );
    }

    let matched = 0;
    if (deleted == null) {
      matched = 0;
    } else if (typeof deleted === "object") {
      if (typeof deleted.deletedCount === "number")
        matched = deleted.deletedCount;
      else if (typeof deleted.matchedCount === "number")
        matched = deleted.matchedCount;
      else if (deleted.acknowledged && deleted.ok) matched = 1;
    } else if (typeof deleted === "number") {
      matched = deleted > 0 ? 1 : 0;
    } else if (typeof deleted === "boolean") {
      matched = deleted ? 1 : 0;
    }

    if (matched === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Failed to delete exam", err);
    return NextResponse.json(
      { error: "Failed to delete exam" },
      { status: 500 }
    );
  }
};

export const POST = async function (req: NextRequest) {
  try {
    const body = await req.json();
    // Basic validation
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const examRepo = new ExamRepository(mongoClient);

    const orderVal = Number.isFinite(body.order)
      ? Number(body.order)
      : undefined;

    const existingByName: any = await examRepo.getAllExam(
      { name: body.name },
      0,
      1
    );
    const existingByOrder: any =
      typeof orderVal === "number"
        ? await examRepo.getAllExam({ order: orderVal }, 0, 1)
        : null;

    const nameDup = hasResults(existingByName);
    const orderDup = hasResults(existingByOrder);

    if (nameDup && orderDup) {
      return NextResponse.json(
        { error: "Exam with this name and order already exist" },
        { status: 400 }
      );
    }
    if (nameDup) {
      return NextResponse.json(
        { error: "Exam with this name already exists" },
        { status: 400 }
      );
    }
    if (orderDup) {
      return NextResponse.json(
        { error: "Exam with this order already exists" },
        { status: 400 }
      );
    }

    const created = await examRepo.createExam({
      name: body.name,
      order: body.order ?? 0,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      isReady: !!body.isReady,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Failed to create exam", err);
    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    );
  }
};

export const PUT = async function (req: NextRequest) {
  try {
    const body = await req.json();

    if (!body._id || typeof body._id !== "string") {
      return NextResponse.json({ error: "_id is required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = new ObjectId(body._id);
    const examRepo = new ExamRepository(mongoClient);

    // 1) Ensure the exam exists first (so we never misreport 404 after a successful update)
    let exists = false;
    try {
      const found: any = await examRepo.getAllExam({ _id: id }, 0, 1);
      if (Array.isArray(found) && found.length) exists = true;
      else if (found && Array.isArray(found.items) && found.items.length)
        exists = true;
      else if (found && Array.isArray(found.data) && found.data.length)
        exists = true;
    } catch {}

    if (!exists) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // 2) Optional: prevent duplicate name on update (excluding self)
    try {
      const existingByName: any = await examRepo.getAllExam(
        { name: body.name, _id: { $ne: id } },
        0,
        1
      );
      const dup =
        (existingByName?.total ?? 0) > 0 ||
        (Array.isArray(existingByName?.items) &&
          existingByName.items.length > 0) ||
        (Array.isArray(existingByName?.data) &&
          existingByName.data.length > 0) ||
        (Array.isArray(existingByName) && existingByName.length > 0);
      if (dup) {
        return NextResponse.json(
          { error: "Another exam with this name already exists" },
          { status: 400 }
        );
      }
    } catch {}

    // 3) Perform the update; don't trust the return value's shape
    const updateDoc = {
      name: body.name,
      order: body.order ?? 0,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      isReady: !!body.isReady,
    };

    try {
      await examRepo.updateExam({ _id: id }, updateDoc);
    } catch (e) {
      console.error("updateExam failed", e);
      return NextResponse.json(
        { error: "Failed to update exam" },
        { status: 500 }
      );
    }

    // 4) Return the fresh document
    try {
      const one: any = await examRepo.getAllExam({ _id: id }, 0, 1);
      if (one && Array.isArray(one.items) && one.items.length) {
        return NextResponse.json(one.items[0], { status: 200 });
      }
      if (one && Array.isArray(one.data) && one.data.length) {
        return NextResponse.json(one.data[0], { status: 200 });
      }
      if (Array.isArray(one) && one.length) {
        return NextResponse.json(one[0], { status: 200 });
      }
      // If for any reason we cannot fetch, still acknowledge success
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch (err) {
    console.error("Failed to update exam", err);
    return NextResponse.json(
      { error: "Failed to update exam" },
      { status: 500 }
    );
  }
};
