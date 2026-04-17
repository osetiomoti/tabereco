import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { deleteS3Objects } from '@/lib/s3';

/**
 * GET /api/profiles/me
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  });
}

/**
 * PATCH /api/profiles/me
 * Update the user's name and/or avatar_url.
 */
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { name, avatar_url } = await request.json();
      const data: { name?: string; avatar_url?: string | null } = {};
      if (name && typeof name === 'string') data.name = name.trim().slice(0, 50);
      if (avatar_url !== undefined) data.avatar_url = avatar_url;

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
      }

      // If avatar_url is being updated, delete the old one from S3
      if (data.avatar_url !== undefined) {
        const oldUser = await prisma.user.findUnique({ where: { id: auth.userId } });
        if (oldUser && oldUser.avatar_url && oldUser.avatar_url !== data.avatar_url) {
          deleteS3Objects([oldUser.avatar_url], auth.idToken).catch(console.error);
        }
      }

      const user = await prisma.user.update({ where: { id: auth.userId }, data });
      return NextResponse.json({ success: true, data: user });
    } catch (e: any) {
      console.error('[PATCH /api/profiles/me]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

