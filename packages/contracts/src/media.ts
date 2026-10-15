import { z } from 'zod';
import { IdSchema, RULES } from './common';

export const MediaKind = z.enum(['photo', 'audio']);
export type MediaKind = z.infer<typeof MediaKind>;

export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AUDIO_MIME_TYPES = ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav'] as const;

/** 8 MB of binary data, base64-encoded. */
export const MAX_MEDIA_BASE64_LENGTH = Math.ceil((8 * 1024 * 1024 * 4) / 3);

export const UploadMediaInputSchema = z
  .object({
    kind: MediaKind,
    mimeType: z.string(),
    dataBase64: z.string().min(1).max(MAX_MEDIA_BASE64_LENGTH),
    /** Required for audio; at most RULES.audioMaxSeconds. */
    durationSec: z.number().positive().max(RULES.audioMaxSeconds).optional(),
  })
  .superRefine((v, ctx) => {
    const allowed: readonly string[] = v.kind === 'photo' ? PHOTO_MIME_TYPES : AUDIO_MIME_TYPES;
    if (!allowed.includes(v.mimeType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mimeType'], message: `Unsupported ${v.kind} type` });
    }
    if (v.kind === 'audio' && v.durationSec === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durationSec'], message: 'Audio needs a duration' });
    }
  });
export type UploadMediaInput = z.infer<typeof UploadMediaInputSchema>;

export const MediaUploadResultSchema = z.object({ mediaId: IdSchema, kind: MediaKind });
export type MediaUploadResult = z.infer<typeof MediaUploadResultSchema>;
