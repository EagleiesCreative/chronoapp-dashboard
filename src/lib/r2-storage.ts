import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const rawEndpoint = process.env.R2_ENDPOINT!;
// Robust handling: ensuring endpoint doesn't include the bucket name if specified separately
const R2_ENDPOINT = rawEndpoint.includes(R2_BUCKET_NAME) 
  ? rawEndpoint.replace(new RegExp(`/${R2_BUCKET_NAME}/?$`), '') 
  : rawEndpoint;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || ""; // For custom domain if available

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a report buffer to R2 and returns the signed URL
 */
export async function uploadReport(
  buffer: Buffer,
  filename: string,
  contentType: string = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
): Promise<string> {
  const key = `reports/${Date.now()}-${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Generate a signed URL that's valid for 1 hour
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Uploads a frame template image to R2
 */
export async function uploadFrame(
    buffer: Buffer,
    filename: string,
    organizationId: string,
    contentType: string = "image/png"
): Promise<string> {
    const key = `frames/${organizationId}/${Date.now()}-${filename}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: {
                organizationId,
                type: 'frame-template'
            }
        })
    );

    // For frames, we want a long-lived URL or public access
    // If public domain is set, use it. Otherwise signed URL for 1 year.
    if (R2_PUBLIC_DOMAIN) {
        return `${R2_PUBLIC_DOMAIN}/${key}`;
    }

    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 604800 }); // Max 7 days for SigV4
}

/**
 * Uploads a capture (photo/gif) to R2
 */
export async function uploadCapture(
  buffer: Buffer,
  key: string,
  contentType: string = "image/jpeg"
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 604800 }); // Max 7 days
}

export const r2Storage = {
    uploadReport,
    uploadFrame,
    uploadCapture
}

export default r2Storage;
