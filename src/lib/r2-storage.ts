import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
export async function uploadReport({
  organizationId,
  year,
  month,
  format,
  fileBuffer,
}: {
  organizationId: string;
  year: number;
  month: number;
  format: 'excel' | 'pdf';
  fileBuffer: Buffer;
}): Promise<{ key: string; url: string; size: number }> {
  const filename = `report-${organizationId}-${year}-${month}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
  const contentType = format === 'excel' 
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    : "application/pdf";
  const key = `reports/${organizationId}/${Date.now()}-${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  // Generate a signed URL that's valid for 1 hour
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  return {
    key,
    url,
    size: fileBuffer.length
  };
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

/**
 * Generates a fresh signed URL for an existing object key or URL
 */
export async function getFreshSignedUrl(
    keyOrUrl: string, 
    expiresIn: number = 604800
): Promise<string> {
    try {
        let key = keyOrUrl;

        // If it's a full URL, try to extract the key
        if (keyOrUrl.startsWith('http')) {
            const urlObj = new URL(keyOrUrl);
            
            // If it's already using the public domain, no need to refresh
            if (R2_PUBLIC_DOMAIN && keyOrUrl.startsWith(R2_PUBLIC_DOMAIN)) {
                return keyOrUrl;
            }

            // Extract key from R2 storage URL (hostname contains r2.cloudflarestorage.com)
            if (urlObj.hostname.includes('r2.cloudflarestorage.com')) {
                let pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
                
                // If bucket name was part of the path (S3-style), remove it
                if (pathname.startsWith(`${R2_BUCKET_NAME}/`)) {
                    key = pathname.replace(`${R2_BUCKET_NAME}/`, '');
                } else {
                    key = pathname;
                }
            } else {
                // Not an R2 URL we manage (or potentially a custom domain already), return as is
                return keyOrUrl;
            }
        }

        // Return public URL if configured
        if (R2_PUBLIC_DOMAIN) {
            return `${R2_PUBLIC_DOMAIN}/${key}`;
        }

        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (err) {
        console.error("Error generating fresh signed URL:", err);
        return keyOrUrl;
    }
}

/**
 * Deletes an object from R2 by its key or full URL
 */
export async function deleteFile(keyOrUrl: string): Promise<void> {
    try {
        let key = keyOrUrl;
        if (keyOrUrl.startsWith('http')) {
            const urlObj = new URL(keyOrUrl);
            let pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
            
            // If bucket name was part of the path, remove it
            if (pathname.startsWith(`${R2_BUCKET_NAME}/`)) {
                key = pathname.replace(`${R2_BUCKET_NAME}/`, '');
            } else {
                key = pathname;
            }
        }

        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
            })
        );
    } catch (err) {
        console.error("Error deleting file from R2:", err);
        // We don't throw here to allow database deletion to proceed even if R2 cleanup fails
    }
}

export const r2Storage = {
    uploadReport,
    uploadFrame,
    uploadCapture,
    getFreshSignedUrl,
    deleteFile
}

export default r2Storage;
