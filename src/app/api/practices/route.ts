import { PracticeDtoSchema } from "@/models/practice.model";
import { PracticeRepository } from "@/repositories/practice.repo";
import mongoClient from "@/lib/mongodb";
import { TExamType } from "@/models/enums";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { logger, captureException, trackAPICall, PerformanceTracker } from "@/lib/sentry-logger";
export async function POST(req: NextRequest) {
  const tracker = new PerformanceTracker("Create Practice Session", "practices_api");

  try {
    const body = await req.json();
    const practiceParser = PracticeDtoSchema.omit({ id: true }).safeParse(body);

    if (practiceParser.success) {
      logger.info("Creating practice session", {
        component: "practices_api",
        action: "create_practice",
        metadata: {
          practiceType: practiceParser.data.type,
        },
      });

      const practiceRepo = new PracticeRepository(mongoClient);
      const practiceDto = await practiceRepo.createPractice(
        practiceParser.data
      );

      logger.info("Practice session created", {
        component: "practices_api",
        action: "practice_created",
        metadata: {
          practiceId: practiceDto.id,
        },
      });

      trackAPICall("POST", "/api/practices", 200, { practiceId: practiceDto.id });
      tracker.finish({ success: true });

      return NextResponse.json({ id: practiceDto.id }, { status: 200 });
    } else {
      logger.warn("Invalid practice data", {
        component: "practices_api",
        action: "validation_failed",
        metadata: {
          errors: practiceParser.error.errors,
        },
      });

      tracker.finish({ success: false, reason: "validation_error" });

      return NextResponse.json(
        { message: practiceParser.error },
        { status: 400 }
      );
    }
  } catch (error) {
    captureException(error, {
      component: "practices_api",
      action: "create_practice_error",
    });

    tracker.finish({ success: false, reason: "exception" });

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
export const GET = async function (req: NextRequest) {
  const tracker = new PerformanceTracker("Get Practices", "practices_api");

  try {
    const type: string | null = req.nextUrl.searchParams.get("type");
    const isFree: string | null = req.nextUrl.searchParams.get("isFree");
    const page: string = req.nextUrl.searchParams.get("page") ?? "0";
    const limit: string = req.nextUrl.searchParams.get("limit") ?? "10";
    const taskId: string | null = req.nextUrl.searchParams.get("taskId") ?? null;

    logger.info("Fetching practices", {
      component: "practices_api",
      action: "get_practices",
      metadata: {
        type,
        page,
        limit,
        taskId,
      },
    });

    const practiceRepo = new PracticeRepository(mongoClient);
    const practices = await practiceRepo.getAllPractice(
      {
        type: type ? (type.toString().toUpperCase() as TExamType) : undefined,
        taskId: taskId ? new ObjectId(taskId) : undefined,
      },
      parseInt(page),
      parseInt(limit)
    );

    trackAPICall("GET", "/api/practices", 200, { count: practices.items?.length || 0 });
    tracker.finish({ success: true, count: practices.items?.length || 0 });

    return NextResponse.json(
      { ...practices, filters: { type, isFree } },
      { status: 200 }
    );
  } catch (error) {
    captureException(error, {
      component: "practices_api",
      action: "get_practices_error",
    });

    tracker.finish({ success: false });

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};
