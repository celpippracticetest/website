import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
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

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);

    const email = user.emailAddresses.find((e) => e.id === emailId);
    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    await clerk.emailAddresses.deleteEmailAddress(email.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
