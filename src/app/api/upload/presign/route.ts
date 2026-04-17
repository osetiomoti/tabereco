import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { withAuth } from '@/lib/auth';

const REGION = process.env.COGNITO_REGION ?? 'ap-northeast-1';
const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? '';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * POST /api/upload/presign
 * Generates an S3 presigned URL for direct file upload.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { fileName, contentType } = await request.json();
      
      if (!fileName || !contentType) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      // Isolate files by user ID
      const key = `users/${auth.userId}/${Date.now()}-${fileName}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return NextResponse.json({
        success: true,
        data: {
          url,
          key,
          publicUrl: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
        },
      });
    } catch (e: any) {
      console.error('[S3 Presign] Error:', e);
      return NextResponse.json(
        { success: false, error: 'Failed to generate presigned URL' },
        { status: 500 }
      );
    }
  });
}
