# Implementation Plan

## 1. S3 Upload via Server-Side Proxy (Fix CORS)
**Problem**: Direct browser→S3 PUT is blocked by CORS
**Solution**: Proxy upload through Next.js API using Cognito Identity Pool creds server-side

- [MODIFY] `src/app/api/upload/s3-credentials/route.ts` → rename to `s3-proxy/route.ts` pattern
- [NEW] `src/app/api/upload/s3-proxy/route.ts` — accepts multipart file, uploads from server to S3 using Identity Pool creds, returns URL
- [MODIFY] `src/hooks/useUpload.ts` — POST to `/api/upload/s3-proxy` instead of direct S3

## 2. Image Resize Before Upload
- [MODIFY] `src/hooks/useUpload.ts` — add `resizeImage()` function using Canvas API before upload

## 3. Group Members Display
- [NEW] `src/app/api/groups/[id]/members/route.ts` — GET returns members list
- [MODIFY] `src/app/groups/[id]/page.tsx` — add Members tab showing avatar + name per member

## 4. User Profile Edit (Nickname + Avatar)
- [MODIFY] `src/app/api/profiles/me/route.ts` — add PATCH handler
- [MODIFY] `src/app/settings/page.tsx` — add inline edit for name + avatar upload
- OR use existing `/settings/profile` page if it exists

## 5. Remove Leaf Icon from Settings
- [MODIFY] `src/app/settings/page.tsx` lines 34-37 — remove the 🌿 83 badge
