import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity';
import { withAuth } from '@/lib/auth';

const IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID ?? '';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const REGION = process.env.COGNITO_REGION ?? 'ap-northeast-1';

const identityClient = new CognitoIdentityClient({ region: REGION });

/**
 * GET /api/upload/s3-credentials
 * Issues temporary S3 access credentials via Cognito Identity Pool.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    // Get id_token from cookie
    const idToken = request.cookies.get('id_token')?.value;
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'ID token missing' },
        { status: 401 }
      );
    }

    if (!IDENTITY_POOL_ID) {
      return NextResponse.json(
        { success: false, error: 'Identity Pool ID missing' },
        { status: 503 }
      );
    }

    const cognitoProviderKey = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

    try {
      // Step 1: Get Identity ID
      const getIdRes = await identityClient.send(new GetIdCommand({
        IdentityPoolId: IDENTITY_POOL_ID,
        Logins: {
          [cognitoProviderKey]: idToken,
        },
      }));

      if (!getIdRes.IdentityId) {
        throw new Error('Failed to get Identity ID');
      }

      // Step 2: Get Credentials
      const credRes = await identityClient.send(new GetCredentialsForIdentityCommand({
        IdentityId: getIdRes.IdentityId,
        Logins: {
          [cognitoProviderKey]: idToken,
        },
      }));

      const creds = credRes.Credentials;
      if (!creds?.AccessKeyId || !creds?.SecretKey || !creds?.SessionToken) {
        throw new Error('Failed to get temporary credentials');
      }

      return NextResponse.json({
        success: true,
        data: {
          accessKeyId: creds.AccessKeyId,
          secretAccessKey: creds.SecretKey,
          sessionToken: creds.SessionToken,
          expiration: creds.Expiration,
          region: REGION,
          bucket: process.env.AWS_S3_BUCKET_NAME ?? '',
          allowedPrefix: `users/${auth.userId}/`, // User-specific isolation
        },
      });
    } catch (e: any) {
      console.error('[S3 Credentials] Error:', e);
      return NextResponse.json(
        { success: false, error: e.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
