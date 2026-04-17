import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { withAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID ?? '';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const REGION = process.env.COGNITO_REGION ?? 'ap-northeast-1';
const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? '';

const identityClient = new CognitoIdentityClient({ region: REGION });

/**
 * POST /api/upload/s3-proxy
 * Server-side proxy: uses Cognito Identity Pool creds to upload to S3,
 * avoiding browser CORS restrictions entirely.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const category = (formData.get('category') as string) || 'posts';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileId = uuidv4();
      const key = `users/${auth.userId}/${category}/${Date.now()}-${fileId}.${ext}`;

      // Use id_token from AuthContext (already refreshed by withAuth if needed)
      if (IDENTITY_POOL_ID && BUCKET) {
        const idToken = auth.idToken;
        if (!idToken) {
          return NextResponse.json(
            { success: false, error: 'ID token missing — please log in again' },
            { status: 401 }
          );
        }

        const cognitoProviderKey = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
        const logins = { [cognitoProviderKey]: idToken };

        const getIdRes = await identityClient.send(new GetIdCommand({
          IdentityPoolId: IDENTITY_POOL_ID,
          Logins: logins,
        }));

        if (!getIdRes.IdentityId) throw new Error('Failed to get Identity ID');

        const credRes = await identityClient.send(new GetCredentialsForIdentityCommand({
          IdentityId: getIdRes.IdentityId,
          Logins: logins,
        }));

        const creds = credRes.Credentials;
        if (!creds?.AccessKeyId || !creds?.SecretKey || !creds?.SessionToken) {
          throw new Error('Failed to get temporary credentials');
        }

        const s3 = new S3Client({
          region: REGION,
          credentials: {
            accessKeyId: creds.AccessKeyId,
            secretAccessKey: creds.SecretKey,
            sessionToken: creds.SessionToken,
          },
        });

        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        }));

        const cfDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
        const url = cfDomain
          ? `https://${cfDomain}/${key}`
          : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

        return NextResponse.json({ success: true, data: { url } });
      }

      // Local fallback (dev mode without S3 config)
      const { writeFile, mkdir } = await import('fs/promises');
      const path = await import('path');
      const fileName = `${auth.userId}-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), buffer);
      const url = `/uploads/${fileName}`;

      return NextResponse.json({ success: true, data: { url } });
    } catch (e: any) {
      console.error('[S3 Proxy Upload] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
