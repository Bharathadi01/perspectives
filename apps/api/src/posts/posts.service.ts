import { Injectable } from '@nestjs/common';
import { CreatePostInput, Post, RULES, UpdatePostInput, focusAreaKeys } from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { TextModerator } from '../moderation/moderation';
import { PrismaService } from '../prisma/prisma.service';
import { POST_INCLUDE, ProfileMapper } from '../profiles/profile.mapper';
import { ProfilesService } from '../profiles/profiles.service';

/**
 * A profile has 1 to 6 active posts. Position 0 is the primary post and must be a photo.
 */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ProfileMapper,
    private readonly profiles: ProfilesService,
    private readonly moderator: TextModerator,
  ) {}

  async create(userId: string, input: CreatePostInput): Promise<Post> {
    const active = await this.prisma.post.count({ where: { ownerId: userId, status: 'active' } });
    if (active >= RULES.maxPosts) {
      throw new AppException('POST_LIMIT_REACHED', `You can have up to ${RULES.maxPosts} posts.`);
    }
    if (active === 0 && input.kind !== 'photo') {
      throw new AppException('PRIMARY_POST_REQUIRED', 'Your first post needs a photo.');
    }
    if (input.mediaId) {
      const media = await this.prisma.media.findUnique({ where: { id: input.mediaId }, include: { post: true } });
      if (!media || media.ownerId !== userId || media.purpose !== 'post' || media.post || media.kind !== input.kind) {
        throw new AppException('MEDIA_INVALID', 'Upload the photo or audio for this post first.');
      }
    } else if (input.kind !== 'text') {
      throw new AppException('MEDIA_INVALID', 'Upload the photo or audio for this post first.');
    }

    if (input.audioMediaId) {
      const audioMedia = await this.prisma.media.findUnique({
        where: { id: input.audioMediaId },
        include: { post: true, postAudio: true },
      });
      if (
        !audioMedia ||
        audioMedia.ownerId !== userId ||
        audioMedia.purpose !== 'post' ||
        audioMedia.post ||
        audioMedia.postAudio ||
        audioMedia.kind !== 'audio'
      ) {
        throw new AppException('MEDIA_INVALID', 'Upload the voice audio for this post first.');
      }
    }

    await this.assertPromptAllowed(input.prompt);
    const post = await this.prisma.post.create({
      data: {
        ownerId: userId,
        position: active,
        kind: input.kind,
        mediaId: input.mediaId ?? null,
        audioMediaId: input.audioMediaId ?? null,
        prompt: input.prompt,
        category: input.category,
        focusAreas: input.focusAreas,
      },
      include: POST_INCLUDE,
    });
    await this.profiles.recomputeLive(userId);
    return this.mapper.post(post);
  }

  async update(userId: string, postId: string, input: UpdatePostInput): Promise<Post> {
    const post = await this.ownActivePost(userId, postId);
    const category = input.category ?? post.category;
    if (input.focusAreas && !input.focusAreas.every((k) => focusAreaKeys(category).includes(k))) {
      throw new AppException('VALIDATION_FAILED', 'Those focus areas do not belong to this category.');
    }
    if (input.prompt) await this.assertPromptAllowed(input.prompt);

    if (input.audioMediaId) {
      const audioMedia = await this.prisma.media.findUnique({
        where: { id: input.audioMediaId },
      });
      if (!audioMedia || audioMedia.ownerId !== userId || audioMedia.purpose !== 'post' || audioMedia.kind !== 'audio') {
        throw new AppException('MEDIA_INVALID', 'Upload the voice audio for this post first.');
      }
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        prompt: input.prompt,
        audioMediaId: input.audioMediaId,
        category: input.category,
        focusAreas: input.focusAreas,
      },
      include: POST_INCLUDE,
    });
    return this.mapper.post(updated);
  }

  /**
   * Reorder active posts. Position 0 is always the primary post and must be a photo.
   * All active posts must be included in the list.
   */
  async reorder(userId: string, postIds: string[]): Promise<Post[]> {
    const active = await this.prisma.post.findMany({
      where: { ownerId: userId, status: 'active' },
      include: POST_INCLUDE,
    });
    if (active.length !== postIds.length) {
      throw new AppException('VALIDATION_FAILED', 'All active posts must be included in the reorder list.');
    }
    const activeMap = new Map(active.map((p) => [p.id, p]));
    for (const id of postIds) {
      if (!activeMap.has(id)) {
        throw new AppException('VALIDATION_FAILED', `Invalid post in reorder list: ${id}`);
      }
    }
    const firstPost = activeMap.get(postIds[0])!;
    if (firstPost.kind !== 'photo') {
      throw new AppException('PRIMARY_POST_REQUIRED', 'The featured item must be a photo.');
    }
    await this.prisma.$transaction(
      postIds.map((id, index) =>
        this.prisma.post.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
    await this.profiles.recomputeLive(userId);
    const updated = await this.prisma.post.findMany({
      where: { ownerId: userId, status: 'active' },
      orderBy: { position: 'asc' },
      include: POST_INCLUDE,
    });
    return updated.map((p) => this.mapper.post(p));
  }

  /** Removing the primary photo promotes the next photo post; at least one post must remain. */
  async remove(userId: string, postId: string): Promise<void> {
    const post = await this.ownActivePost(userId, postId);
    const others = await this.prisma.post.findMany({
      where: { ownerId: userId, status: 'active', id: { not: postId } },
      orderBy: { position: 'asc' },
    });
    if (others.length < RULES.minPosts) {
      throw new AppException('PRIMARY_POST_REQUIRED', 'Keep at least one post with a photo.');
    }
    let ordered = others;
    if (post.position === 0) {
      const nextPhoto = others.find((p) => p.kind === 'photo');
      if (!nextPhoto) {
        throw new AppException('PRIMARY_POST_REQUIRED', 'Add another photo post before removing your primary photo.');
      }
      ordered = [nextPhoto, ...others.filter((p) => p.id !== nextPhoto.id)];
    }
    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id: postId }, data: { status: 'removed', position: 100 + post.position } }),
      ...ordered.map((p, i) => this.prisma.post.update({ where: { id: p.id }, data: { position: i } })),
    ]);
    await this.profiles.recomputeLive(userId);
  }

  private async ownActivePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.ownerId !== userId || post.status !== 'active') {
      throw new AppException('NOT_FOUND', 'Post not found.');
    }
    return post;
  }

  private async assertPromptAllowed(prompt: string): Promise<void> {
    const verdict = await this.moderator.check(prompt);
    if (!verdict.allowed) {
      throw new AppException('MODERATION_FAILED', 'That prompt breaks the community guidelines.');
    }
  }
}
