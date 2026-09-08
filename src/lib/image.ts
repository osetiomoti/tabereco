/**
 * Helper functions for handling image URLs and S3 object keys.
 */

const CF_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || process.env.COGNITO_REGION || 'ap-northeast-1';

/**
 * Resolves an S3 key or full URL to a publicly accessible CloudFront URL.
 * - If already a full URL (http://, https://, /), data URL, or blob URL, returns as-is.
 * - If an S3 key (e.g., "users/123/posts/456.webp"), prepends CloudFront domain.
 */
export function getImageUrl(keyOrUrl: string | null | undefined): string {
  if (!keyOrUrl) return '';
  const trimmed = keyOrUrl.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  return CF_DOMAIN ? `https://${CF_DOMAIN}/${trimmed}` : `/${trimmed}`;
}

/**
 * Resolves an array of S3 keys or URLs into an array of accessible URLs.
 */
export function getImageUrls(keysOrUrls: (string | null | undefined)[] | null | undefined): string[] {
  if (!keysOrUrls || !Array.isArray(keysOrUrls)) return [];
  return keysOrUrls.map(getImageUrl).filter(Boolean);
}

/**
 * Strips CloudFront/S3 domain from a URL to extract the relative S3 key (e.g., "users/...").
 * If already a relative S3 key, returns as-is.
 */
export function toS3Key(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null;
  const trimmed = keyOrUrl.trim();
  if (!trimmed) return null;

  // Already an S3 key
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  // CloudFront URL
  if (CF_DOMAIN && trimmed.includes(CF_DOMAIN)) {
    const parts = trimmed.split(`${CF_DOMAIN}/`);
    return parts.length > 1 ? parts[1] : trimmed;
  }

  // Raw S3 URL
  if (S3_BUCKET && trimmed.includes(`${S3_BUCKET}.s3`)) {
    const regex = new RegExp(`https?://${S3_BUCKET}\\.s3[.-][^/]+/`);
    return trimmed.replace(regex, '');
  }

  return trimmed;
}
