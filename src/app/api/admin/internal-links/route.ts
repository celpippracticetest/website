import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { ObjectId } from "bson";
import { getDb } from "@/lib/appDocumentsClient";
import { InternalLinkWriteSchema } from "@/models/internal-link.model";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const links = await db.collection("internalLinks").find().sort({ keyword: 1 }).toArray();

  return NextResponse.json(
    links.map((link) => ({
      ...link,
      id: link._id != null ? String(link._id) : "",
    }))
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Check if this is a migration request
    if (body.action === "migrate") {
      return NextResponse.json({
        message:
          "Migration skipped: default internal-link rules have been removed. Please create internal links in the admin UI.",
      });
    }

    const validation = InternalLinkWriteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const db = await getDb();
    const newLink = {
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("internalLinks").insertOne(newLink);

    return NextResponse.json({
      ...newLink,
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Failed to create link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const validation = InternalLinkWriteSchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("internalLinks").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...validation.data,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  try {
    const db = await getDb();
    await db.collection("internalLinks").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
