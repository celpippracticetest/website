import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const R2_ENDPOINT = process.env.BLOG_IMAGE_R2_ENDPOINT;
const R2_BUCKET = "celpip-blog-images";
const BLOG_IMAGE_PUBLIC_BASE_URL = process.env.BLOG_IMAGE_PUBLIC_BASE_URL || "";
const MAX_UPLOAD_SIZE_BYTES = Number(
  process.env.BLOG_IMAGE_MAX_SIZE_BYTES || 10 * 1024 * 1024,
);

function buildS3Client() {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    forcePathStyle: true,
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
  const baseUrl = BLOG_IMAGE_PUBLIC_BASE_URL.trim().replace(/\/+$/, "");
  return `${baseUrl}/${objectKey}`;
}

function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Failed to upload image.";
  }

  const errorName = (error as { name?: string }).name || "";
  const errorMessage = error.message || "";

  if (errorName.includes("Credentials")) {
    return "Missing or invalid Cloudflare R2 credentials for blog image upload.";
  }
  if (errorName.includes("AccessDenied")) {
    return "Cloudflare R2 access denied while uploading image. Check token permissions.";
  }
  if (errorName.includes("Signature")) {
    return "Cloudflare R2 signature mismatch. Verify endpoint and R2 credentials.";
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
        Bucket: R2_BUCKET,
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
