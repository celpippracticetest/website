import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = jwt.sign(
      {
        productUserId: user.id,
        productId: process.env.NEXT_PUBLIC_CELLO_PRODUCT_ID || "YOUR_PRODUCT_ID",
      },
      process.env.CELLO_PRODUCT_SECRET || "YOUR_SECRET_KEY",
      {
        algorithm: "HS512",
      }
    );

    // Return the token
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
