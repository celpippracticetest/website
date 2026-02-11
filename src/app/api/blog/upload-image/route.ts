import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const S3_REGION =
  process.env.BLOG_IMAGE_S3_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  "eu-north-1";
const S3_BUCKET = process.env.BLOG_IMAGE_S3_BUCKET || "celtest-blog-images";
const BLOG_IMAGE_PUBLIC_BASE_URL = process.env.BLOG_IMAGE_PUBLIC_BASE_URL;
const MAX_UPLOAD_SIZE_BYTES = Number(
  process.env.BLOG_IMAGE_MAX_SIZE_BYTES || 10 * 1024 * 1024,
);

function buildS3Client() {
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return new S3Client({
    region: S3_REGION,
  });
}

function getFileExtension(fileName: string): string {
  const splitName = fileName.split(".");
  if (splitName.length <= 1) {
    return "jpg";
  }
  return splitName[splitName.length - 1].toLowerCase();
}

function buildUploadedFileUrl(objectKey: string): string {
  if (BLOG_IMAGE_PUBLIC_BASE_URL?.trim()) {
    const baseUrl = BLOG_IMAGE_PUBLIC_BASE_URL.trim().replace(/\/+$/, "");
    return `${baseUrl}/${objectKey}`;
  }

  if (S3_REGION === "us-east-1") {
    return `https://${S3_BUCKET}.s3.amazonaws.com/${objectKey}`;
  }

  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${objectKey}`;
}

function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Failed to upload image.";
  }

  const errorName = (error as { name?: string }).name || "";
  const errorMessage = error.message || "";

  if (
    errorName.includes("PermanentRedirect") ||
    errorMessage.includes("must be addressed using the specified endpoint")
  ) {
    return "S3 bucket region mismatch. Set BLOG_IMAGE_S3_REGION in Vercel to the bucket region (for example: us-east-1).";
  }
  if (errorName.includes("Credentials")) {
    return "Missing or invalid AWS credentials for blog image upload.";
  }
  if (errorName.includes("AccessDenied")) {
    return "AWS access denied while uploading image. Check bucket permissions.";
  }
  if (errorName.includes("Signature")) {
    return "AWS signature mismatch. Verify region and credentials.";
  }

  return errorMessage || "Failed to upload image.";
}

function getUploadErrorStatus(error: unknown): number {
  const httpStatusCode = (error as { $metadata?: { httpStatusCode?: number } })
    ?.$metadata?.httpStatusCode;
  if (httpStatusCode && httpStatusCode >= 400 && httpStatusCode < 600) {
    return httpStatusCode;
  }
  return 500;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as {
      name?: string;
      type?: string;
      size?: number;
      arrayBuffer?: () => Promise<ArrayBuffer>;
    } | null;

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { message: "Image file is required." },
        { status: 400 },
      );
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "Only image files are supported." },
        { status: 400 },
      );
    }

    if (typeof file.size === "number" && file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          message: `Image is too large. Max size is ${Math.round(
            MAX_UPLOAD_SIZE_BYTES / (1024 * 1024),
          )}MB.`,
        },
        { status: 413 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExt = getFileExtension(file.name || "image.jpg");
    const objectKey = `blog-images/${Date.now()}-${randomUUID()}.${fileExt}`;

    const upload = new Upload({
      client: buildS3Client(),
      params: {
        Bucket: S3_BUCKET,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type,
      },
    });

    const result = await upload.done();
    const uploadedUrl = result.Location || buildUploadedFileUrl(objectKey);

    return NextResponse.json(
      { url: uploadedUrl, key: objectKey },
      { status: 200 },
    );
  } catch (error) {
    console.error("Blog image upload failed:", error);
    return NextResponse.json(
      { message: getUploadErrorMessage(error) },
      { status: getUploadErrorStatus(error) },
    );
  }
}
