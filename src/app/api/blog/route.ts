import mongoClient from "@/lib/mongodb";
import { BlogWriteSchema, BlogStatusEnumSchema } from "@/models/blog.model";
import { BlogRepository } from "@/repositories/blog.repo";
import { NextRequest, NextResponse } from "next/server";

type LinkedInPublishResult = {
  attempted: boolean;
  success: boolean;
  message: string;
};

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.APP_BASE_URL?.replace(/\/$/, "") ||
  "https://celpippracticetest.com";

async function publishBlogToLinkedIn(input: {
  title: string;
  excerpt?: string;
  slug: string;
}): Promise<LinkedInPublishResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const authorUrn = process.env.LINKEDIN_AUTHOR_URN;

  if (!accessToken || !authorUrn) {
    return {
      attempted: false,
      success: false,
      message: "LinkedIn credentials are missing. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN.",
    };
  }

  const blogUrl = `${APP_BASE_URL}/blog/${input.slug}`;
  const shareCommentary = `${input.title}\n\n${(input.excerpt ?? "").trim()}`.trim().slice(0, 1200);

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: shareCommentary },
          shareMediaCategory: "ARTICLE",
          media: [
            {
              status: "READY",
              originalUrl: blogUrl,
              title: { text: input.title.slice(0, 200) },
              description: { text: (input.excerpt ?? "").slice(0, 256) },
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LinkedIn publish failed:", response.status, errorText);
    return {
      attempted: true,
      success: false,
      message: `LinkedIn API error (${response.status}).`,
    };
  }

  return {
    attempted: true,
    success: true,
    message: "Published to LinkedIn successfully.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const publishToLinkedIn = body?.publishToLinkedIn === true;
    const parser = BlogWriteSchema.safeParse(body);

    if (!parser.success) {
      return NextResponse.json({ message: parser.error.flatten() }, { status: 400 });
    }

    const repo = new BlogRepository(mongoClient);
    const blog = await repo.createBlog(parser.data);
    const shouldPublishToLinkedIn = publishToLinkedIn && blog.status === "published";
    const linkedinResult = shouldPublishToLinkedIn
      ? await publishBlogToLinkedIn({
          title: blog.title,
          excerpt: blog.excerpt,
          slug: blog.slug,
        })
      : {
          attempted: publishToLinkedIn,
          success: false,
          message: publishToLinkedIn
            ? "LinkedIn publish skipped because blog status is not published."
            : "LinkedIn publish not requested.",
        };

    return NextResponse.json({ id: blog.id, linkedin: linkedinResult }, { status: 200 });
  } catch (error) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json({ message: "Failed to create blog post." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const statusValue = req.nextUrl.searchParams.get("status");
    const category = req.nextUrl.searchParams.get("category") ?? undefined;
    const tag = req.nextUrl.searchParams.get("tag") ?? undefined;
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10);

    const statusParser = statusValue
      ? BlogStatusEnumSchema.safeParse(statusValue)
      : { success: true as const, data: undefined };

    if (!statusParser.success) {
      return NextResponse.json({ message: "Invalid status filter." }, { status: 400 });
    }

    const repo = new BlogRepository(mongoClient);
    const result = await repo.getAllBlogs(
      {
        status: statusParser.data,
        category,
        tag,
        search,
      },
      page,
      limit
    );

    return NextResponse.json(
      {
        ...result,
        filters: { status: statusParser.data ?? null, category, tag, search },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch blog posts:", error);
    return NextResponse.json({ message: "Failed to fetch blog posts." }, { status: 500 });
  }
}
