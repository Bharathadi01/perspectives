import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, RULES } from './common';

export const PostKind = z.enum(['photo', 'audio']);
export type PostKind = z.infer<typeof PostKind>;

/** Working category names; final wording is a product-copy task (docs/PRODUCT.md). */
export const PostCategory = z.enum(['style', 'fitness', 'looks', 'voice', 'vibe', 'other']);
export type PostCategory = z.infer<typeof PostCategory>;

export const PostStatus = z.enum(['pending_moderation', 'active', 'paused', 'removed', 'archived']);
export type PostStatus = z.infer<typeof PostStatus>;

export interface FocusAreaDefinition {
  key: string;
  label: string;
  /** Spark hint shown to the giver under the comment box. */
  hint: string;
}

export interface CategoryDefinition {
  label: string;
  focusAreas: readonly FocusAreaDefinition[];
  /** Optional quick-pick chips a giver may add next to the required comment. */
  chips: readonly string[];
}

/**
 * Category catalog: focus areas (owner picks what they want covered), the spark hints derived
 * from them, and the quick-pick chips. Copy is a working draft owned by the developers.
 */
export const CATEGORY_CATALOG: Record<PostCategory, CategoryDefinition> = {
  style: {
    label: 'Style & outfit',
    focusAreas: [
      { key: 'outfit', label: 'The outfit', hint: 'What does the outfit say about them?' },
      { key: 'fit', label: 'Fit', hint: 'How does the fit work on them?' },
      { key: 'colors', label: 'Colors', hint: 'Do the colors work together?' },
      { key: 'grooming', label: 'Hair & grooming', hint: 'What stands out about hair and grooming?' },
      { key: 'occasion', label: 'Right for the occasion', hint: 'Does it suit where they are going?' },
    ],
    chips: ['Put-together', 'Effortless', 'Bold choice', 'Colors work', 'Try a different fit', 'Overdressed for it', 'Underdressed for it'],
  },
  fitness: {
    label: 'Fitness & physique',
    focusAreas: [
      { key: 'physique', label: 'Physique', hint: 'How does their physique come across?' },
      { key: 'posture', label: 'Posture', hint: 'What do you notice about their posture?' },
      { key: 'progress', label: 'Progress', hint: 'What strengths or progress stand out?' },
      { key: 'training', label: 'Training advice', hint: 'Any honest training or form advice?' },
    ],
    chips: ['Strong base', 'Consistency shows', 'Balanced', 'Posture could improve', 'Train the lower body more', 'Great discipline'],
  },
  looks: {
    label: 'Looks & photos',
    focusAreas: [
      { key: 'first_look', label: 'First impression', hint: 'What is your honest first impression?' },
      { key: 'photo', label: 'The photo', hint: 'Is this a good photo of them? Why or why not?' },
      { key: 'expression', label: 'Expression', hint: 'What does their expression say?' },
      { key: 'presence', label: 'Height & presence', hint: 'How does their height or presence come across?' },
    ],
    chips: ['Natural', 'Confident', 'Approachable', 'Great smile', 'Feels posed', 'Try better lighting'],
  },
  voice: {
    label: 'Voice',
    focusAreas: [
      { key: 'tone', label: 'Tone', hint: 'How does their tone of voice come across?' },
      { key: 'clarity', label: 'Clarity', hint: 'Is it clear and easy to follow?' },
      { key: 'confidence', label: 'Confidence', hint: 'Do they sound confident?' },
      { key: 'warmth', label: 'Warmth', hint: 'Does the voice feel warm or distant?' },
    ],
    chips: ['Warm', 'Calm', 'Confident', 'Clear', 'Engaging', 'Speak a little slower'],
  },
  vibe: {
    label: 'Overall vibe',
    focusAreas: [
      { key: 'impression', label: 'First impression', hint: 'What is your honest first impression of them?' },
      { key: 'energy', label: 'Energy', hint: 'What energy do they give off?' },
      { key: 'approachable', label: 'Approachability', hint: 'Do they seem easy to approach? Why?' },
      { key: 'standout', label: 'What stands out', hint: 'What is the one thing that stands out?' },
    ],
    chips: ['Friendly', 'Calm', 'High energy', 'Approachable', 'Mysterious', 'Hard to read'],
  },
  other: {
    label: 'Something else',
    focusAreas: [
      { key: 'take', label: 'Your honest take', hint: 'What is your honest take on this?' },
      { key: 'change', label: 'What to change', hint: 'What would you suggest they change?' },
    ],
    chips: ['Works well', 'Could be clearer', 'Interesting', 'Try another angle'],
  },
};

export function focusAreaKeys(category: PostCategory): string[] {
  return CATEGORY_CATALOG[category].focusAreas.map((f) => f.key);
}

/** Spark hints for a post, in the order of the owner's chosen focus areas. */
export function sparkHintsFor(category: PostCategory, focusAreas: readonly string[]): string[] {
  const defs = CATEGORY_CATALOG[category].focusAreas;
  const hints = focusAreas
    .map((key) => defs.find((d) => d.key === key)?.hint)
    .filter((h): h is string => typeof h === 'string');
  return hints.length > 0 ? hints : defs.map((d) => d.hint);
}

export function chipsFor(category: PostCategory): readonly string[] {
  return CATEGORY_CATALOG[category].chips;
}

const PromptSchema = z.string().trim().min(RULES.promptMinLength).max(RULES.promptMaxLength);

const FocusAreasSchema = z
  .array(z.string())
  .min(RULES.minFocusAreas)
  .max(RULES.maxFocusAreas)
  .refine((keys) => new Set(keys).size === keys.length, 'Focus areas must be unique');

function focusAreasMatchCategory(
  v: { category?: PostCategory; focusAreas?: string[] },
  ctx: z.RefinementCtx,
): void {
  if (!v.category || !v.focusAreas) return;
  const allowed = focusAreaKeys(v.category);
  const invalid = v.focusAreas.filter((k) => !allowed.includes(k));
  if (invalid.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['focusAreas'],
      message: `Not a focus area of ${v.category}: ${invalid.join(', ')}`,
    });
  }
}

export const CreatePostInputSchema = z
  .object({
    kind: PostKind,
    mediaId: IdSchema,
    prompt: PromptSchema,
    category: PostCategory,
    focusAreas: FocusAreasSchema,
  })
  .superRefine(focusAreasMatchCategory);
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const UpdatePostInputSchema = z
  .object({
    prompt: PromptSchema.optional(),
    category: PostCategory.optional(),
    focusAreas: FocusAreasSchema.optional(),
  })
  .refine((v) => v.category === undefined || v.focusAreas !== undefined, {
    message: 'Changing the category requires choosing focus areas for it',
    path: ['focusAreas'],
  })
  .superRefine(focusAreasMatchCategory);
export type UpdatePostInput = z.infer<typeof UpdatePostInputSchema>;

export const PostSchema = z.object({
  id: IdSchema,
  ownerId: IdSchema,
  /** 0 is the primary post. */
  position: z.number().int().min(0),
  kind: PostKind,
  /** Short-lived signed URL. */
  mediaUrl: z.string(),
  durationSec: z.number().nullable(),
  prompt: z.string(),
  category: PostCategory,
  focusAreas: z.array(z.string()),
  status: PostStatus,
  createdAt: IsoDateTimeSchema,
});
export type Post = z.infer<typeof PostSchema>;

/** Compact post reference shown next to a perspective. */
export const PostRefSchema = PostSchema.pick({
  id: true,
  kind: true,
  mediaUrl: true,
  prompt: true,
  category: true,
});
export type PostRef = z.infer<typeof PostRefSchema>;
