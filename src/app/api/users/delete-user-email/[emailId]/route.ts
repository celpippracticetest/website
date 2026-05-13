import { auth } from "@/lib/auth/server-auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { emailId: string } }
) {
  try {
    const { userId } = await auth();

    const { emailId } = params;

    if (!userId || !emailId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Removing individual email addresses is not supported. Accounts use a single primary email.",
      },
      { status: 501 }
    );
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
