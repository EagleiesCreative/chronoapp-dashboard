import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize Cloudflare R2 client (S3-compatible)
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'chronosnap';
const SIGNED_URL_EXPIRY = 86400; // 24 hours in seconds

export interface UploadReportOptions {
    organizationId: string;
    year: number;
    month: number;
    format: 'excel' | 'pdf';
    fileBuffer: Buffer;
}

export interface UploadReportResult {
    key: string;
    url: string;
    size: number;
}

/**
 * Upload a report file to Cloudflare R2
 */
export async function uploadReport(options: UploadReportOptions): Promise<UploadReportResult> {
    const { organizationId, year, month, format, fileBuffer } = options;

    // Debug logging for R2 configuration
    console.log('=== R2 Upload Debug ===');
    console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT ? 'Set' : 'NOT SET');
    console.log('R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? 'Set' : 'NOT SET');
    console.log('R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? 'Set' : 'NOT SET');
    console.log('BUCKET_NAME:', BUCKET_NAME);
    console.log('File size:', fileBuffer.length, 'bytes');

    // Generate unique key for the file
    const timestamp = Date.now();
    const extension = format === 'excel' ? 'xlsx' : 'pdf';
    const key = `reports/${organizationId}/${year}-${String(month).padStart(2, '0')}-${format}-${timestamp}.${extension}`;
    console.log('File key:', key);

    // Determine content type
    const contentType = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

    try {
        console.log('Uploading to R2...');
        // Upload to R2
        await r2Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
            Metadata: {
                organizationId,
                year: String(year),
                month: String(month),
                format,
                uploadedAt: new Date().toISOString(),
            },
        }));
        console.log('Upload successful!');

        // Generate signed URL for download (24-hour expiry)
        console.log('Generating signed URL...');
        const url = await getSignedUrl(
            r2Client,
            new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            }),
            { expiresIn: SIGNED_URL_EXPIRY }
        );
        console.log('Signed URL generated successfully');

        return {
            key,
            url,
            size: fileBuffer.length,
        };
    } catch (error: any) {
        console.error('=== R2 Upload Error ===');
        console.error('Error name:', error?.name);
        console.error('Error message:', error?.message);
        console.error('Error code:', error?.$metadata?.httpStatusCode);
        console.error('Full error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to upload report to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generate a new signed URL for an existing report
 * (Useful when the previous URL has expired)
 */
export async function refreshSignedUrl(key: string): Promise<string> {
    try {
        const url = await getSignedUrl(
            r2Client,
            new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            }),
            { expiresIn: SIGNED_URL_EXPIRY }
        );

        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Delete a report file from R2
 */
export async function deleteReport(key: string): Promise<void> {
    try {
        await r2Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        }));
    } catch (error) {
        console.error('Error deleting report from R2:', error);
        throw new Error(`Failed to delete report from R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Delete old reports (retention policy)
 * Call this periodically to clean up reports older than specified days
 */
export async function cleanupOldReports(retentionDays: number = 90): Promise<number> {
    // This would require listing all objects and filtering by date
    // For now, we'll implement this via database query and delete individual files
    // The actual cleanup logic should be in a cron job that queries the database
    // and calls deleteReport() for expired reports

    console.log(`Cleanup policy: Delete reports older than ${retentionDays} days`);
    return 0; // Return count of deleted files
}

export default {
    uploadReport,
    refreshSignedUrl,
    deleteReport,
    cleanupOldReports,
};
