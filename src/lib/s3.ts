import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env';

const IDENTITY_POOL_ID = env.COGNITO_IDENTITY_POOL_ID ?? '';
const USER_POOL_ID = env.COGNITO_USER_POOL_ID ?? '';
const REGION = env.COGNITO_REGION ?? 'ap-northeast-1';
const BUCKET = env.AWS_S3_BUCKET_NAME ?? '';

const identityClient = new CognitoIdentityClient({ region: REGION });

/**
 * Extracts the S3 object key from a full URL (either CloudFront or direct S3).
 */
export function extractS3KeyFromUrl(url: string): string | null {
  if (!url) return null;
  // e.g., https://d1vw7ugwoz2pss.cloudfront.net/users/123/posts/1234.jpg
  
  if (process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN && url.includes(process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN)) {
    const parts = url.split(`${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/`);
    return parts.length > 1 ? parts[1] : null;
  }
  
  if (BUCKET && url.includes(`${BUCKET}.s3.${REGION}.amazonaws.com/`)) {
    const parts = url.split(`${BUCKET}.s3.${REGION}.amazonaws.com/`);
    return parts.length > 1 ? parts[1] : null;
  }
  
  return null;
}

export async function deleteS3Objects(urls: string[], idToken: string | null) {
  if (!IDENTITY_POOL_ID || !BUCKET || !idToken || urls.length === 0) return;

  const validUrls = urls.filter(Boolean);
  if (validUrls.length === 0) return;

  const keys = Array.from(new Set(validUrls.map(extractS3KeyFromUrl).filter(Boolean) as string[]));
  if (keys.length === 0) return;

  const cognitoProviderKey = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
  const logins = { [cognitoProviderKey]: idToken };

  try {
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

    for (const key of keys) {
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }));
    }
    console.log(`[S3 Delete] Successfully deleted ${keys.length} files`);
  } catch (error) {
    console.error('[S3 Delete] Error deleting files:', error);
  }
}
