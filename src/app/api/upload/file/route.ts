import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/upload/file
 * Development fallback: saves uploaded files to public/uploads/
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${auth.userId}-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');

      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), buffer);

      const url = `/uploads/${fileName}`;
      return NextResponse.json({ success: true, data: { url } });
    } catch (e: any) {
      console.error('[Upload File] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
