import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { randomUUID } from "crypto";

const S3_REGION = process.env.AWS_REGION || "eu-north-1";
const S3_BUCKET = process.env.BLOG_IMAGE_S3_BUCKET || "celtest-audio";
const BLOG_IMAGE_PUBLIC_BASE_URL = process.env.BLOG_IMAGE_PUBLIC_BASE_URL;

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Image file is required." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Only image files are supported." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExt = getFileExtension(file.name);
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

    return NextResponse.json({ url: uploadedUrl, key: objectKey }, { status: 200 });
  } catch (error) {
    console.error("Blog image upload failed:", error);
    return NextResponse.json({ message: "Failed to upload image." }, { status: 500 });
  }
}
