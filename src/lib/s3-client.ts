import { S3Client, CompleteMultipartUploadOutput } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const R2_ENDPOINT =
  process.env.BLOG_IMAGE_R2_ENDPOINT ||
  "https://feec6a3222e867b5ad1b1be80cec59a9.r2.cloudflarestorage.com";

const AWS_REGION = process.env.AWS_REGION || "eu-north-1";

// Use the dedicated audio bucket if configured, otherwise fallback
const BUCKET_NAME = process.env.R2_AUDIO_BUCKET || "celpip-audio";

const R2_PUBLIC_BASE_URL =
  process.env.R2_AUDIO_PUBLIC_BASE_URL ||
  "https://pub-4e7dbebb45ca4fc1bdc4e071081759ca.r2.dev";

export function getS3Client() {
  const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (r2AccessKeyId && r2SecretAccessKey) {
    return new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });
  }

  // Fallback to AWS credentials
  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY ?? "",
    },
  });
}

export async function uploadAudioBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string | null> {
  const client = getS3Client();
  const isR2 = !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const key = `RecordedSpeaking/${Date.now()}_${fileName}`;

  const upload = new Upload({
    client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "audio/m4a",
    },
  });

  try {
    const result = (await upload.done()) as CompleteMultipartUploadOutput;
    
    if (isR2 && R2_PUBLIC_BASE_URL) {
      // Construct public URL for R2
      const baseUrl = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
      return `${baseUrl}/${key}`;
    }

    return result.Location ?? null;
  } catch (error) {
    console.error("Upload failed", error);
    return null;
  }
}
