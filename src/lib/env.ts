/**
 * Environment variable validation using simple checks.
 * In a real-world app, this could be replaced with `zod` and `t3-oss/env-nextjs`.
 */

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  COGNITO_REGION: process.env.COGNITO_REGION,
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET,
  COGNITO_DOMAIN: process.env.COGNITO_DOMAIN,
  COGNITO_IDENTITY_POOL_ID: process.env.COGNITO_IDENTITY_POOL_ID,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  AWS_REGION: process.env.AWS_REGION,
  NEXT_PUBLIC_CLOUDFRONT_DOMAIN: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
};

const requiredServerEnvVars = [
  'DATABASE_URL',
  'COGNITO_REGION',
  'COGNITO_USER_POOL_ID',
  'COGNITO_CLIENT_ID',
  'COGNITO_IDENTITY_POOL_ID',
  'AWS_S3_BUCKET_NAME',
];

if (typeof window === 'undefined') {
  const missing = requiredServerEnvVars.filter(
    (key) => !env[key as keyof typeof env]
  );
  
  if (missing.length > 0) {
    throw new Error(
      `❌ Invalid environment variables: Missing ${missing.join(', ')}`
    );
  }
}
