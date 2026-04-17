import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * AWS Cognito JWT Verifier
 * Public keys are automatically fetched and cached from the JWKS endpoint.
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export interface CognitoPayload {
  sub: string;        // Cognito User ID
  email: string;
  username: string;
  exp: number;        // Unix timestamp
}

/**
 * Verifies the JWT access token and returns the payload.
 */
export async function verifyCognitoToken(token: string): Promise<CognitoPayload> {
  const payload = await verifier.verify(token);
  return {
    sub: payload.sub,
    email: (payload['email'] as string) ?? '',
    username: (payload['cognito:username'] as string) ?? payload.sub,
    exp: payload.exp,
  };
}
