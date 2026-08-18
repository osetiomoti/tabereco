import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { deleteS3Objects } from '@/lib/s3';

/**
 * GET /api/posts/[id]
 * Fetch a single post.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    const post = await prisma.post.findUnique({
      where: {
        id,
        user_id: auth.userId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const result = {
      ...post,
      tags: post.tags.map((pt: any) => pt.tag),
    };

    return NextResponse.json({ success: true, data: result });
  });
}

/**
 * PATCH /api/posts/[id]
 * Update a post.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      const body = await request.json();
      const { tagNames, groups: _groups, ...rawValues } = body;

      // Whitelist: only fields that exist in the Post model
      const ALLOWED = ['title','store_name','comment','rating','image_url','image_urls',
        'visited_at','status','address','google_place_id','latitude','longitude',
        'is_favorite','is_mine_only','price_min','price_max','visit_count',
        'temperature_min','temperature_max'];
      const values: Record<string, any> = {};
      for (const key of ALLOWED) {
        if (key in rawValues) values[key] = rawValues[key];
      }

      // Check for removed images to delete from S3
      if (values.image_urls) {
        const oldPost = await prisma.post.findUnique({ where: { id, user_id: auth.userId } });
        if (oldPost) {
          const removedUrls = oldPost.image_urls.filter((url: string) => !values.image_urls.includes(url));
          if (removedUrls.length > 0) {
            deleteS3Objects(removedUrls, auth.idToken).catch(console.error);
          }
        }
      }

      if ('visited_at' in values) {
        values.visited_at = values.visited_at ? new Date(values.visited_at) : null;
      }

      const post = await prisma.post.update({
        where: { id, user_id: auth.userId },
        data: values,
      });

      if (tagNames !== undefined) {
        await prisma.postTag.deleteMany({ where: { post_id: id } });

        if (tagNames.length > 0) {
          // Get initial sort_order offset
          const lastTag = await prisma.tag.findFirst({
            where: { user_id: auth.userId },
            orderBy: { sort_order: 'desc' },
          });
          let nextOrder = lastTag ? lastTag.sort_order + 1 : 0;
          const postAppType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

          const tags = await Promise.all(
            tagNames.map(async (name: string) => {
              const existing = await prisma.tag.findUnique({
                where: { user_id_name_app_type: { user_id: auth.userId, name: name.trim(), app_type: postAppType } }
              });
              if (existing) return existing;

              return prisma.tag.create({
                data: {
                  user_id: auth.userId,
                  name: name.trim(),
                  app_type: postAppType,
                  sort_order: nextOrder++,
                },
              });
            })
          );
          await prisma.postTag.createMany({
            data: tags.map((tag) => ({ post_id: id, tag_id: tag.id })),
          });
        }
      }

      return NextResponse.json({ success: true, data: post });
    } catch (e: any) {
      console.error('[PATCH /api/posts/[id]] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/posts/[id]
 * Delete a post.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      const oldPost = await prisma.post.findUnique({ where: { id, user_id: auth.userId } });
      if (oldPost && oldPost.image_urls.length > 0) {
        deleteS3Objects(oldPost.image_urls, auth.idToken).catch(console.error);
      }
      
      await prisma.post.delete({ where: { id, user_id: auth.userId } });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE /api/posts/[id]] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
