import { z } from 'zod';

/** Lifestyle Pace: daily rhythm & energy */
export const LifestylePace = z.enum([
  'early_bird',
  'night_owl',
  'balanced',
  'active_adventurer',
  'laid_back',
]);
export type LifestylePace = z.infer<typeof LifestylePace>;

export const LIFESTYLE_PACE_LABELS: Record<LifestylePace, { label: string; icon: string }> = {
  early_bird: { label: 'Early Riser (Sunrise coffee)', icon: 'sunny-outline' },
  night_owl: { label: 'Night Owl (Midnight thoughts)', icon: 'moon-outline' },
  balanced: { label: 'Flexible & Balanced', icon: 'sync-outline' },
  active_adventurer: { label: 'Always on the Move', icon: 'bicycle-outline' },
  laid_back: { label: 'Easygoing & Cozy', icon: 'cafe-outline' },
};

/** Social Preferences: social battery & environment */
export const SocialPreference = z.enum([
  'introvert',
  'extrovert',
  'ambivert',
  'small_groups',
  'social_butterfly',
]);
export type SocialPreference = z.infer<typeof SocialPreference>;

export const SOCIAL_PREFERENCE_LABELS: Record<SocialPreference, { label: string; icon: string }> = {
  introvert: { label: 'Introverted (Recharges solo)', icon: 'book-outline' },
  extrovert: { label: 'Extroverted (Gains energy from people)', icon: 'people-outline' },
  ambivert: { label: 'Ambivert (Depends on the vibe)', icon: 'swap-horizontal-outline' },
  small_groups: { label: 'Intimate circles over crowds', icon: 'cafe-outline' },
  social_butterfly: { label: 'Loves bustling gatherings', icon: 'sparkles-outline' },
};

/** Personality Prompt definitions */
export interface PersonalityPromptDef {
  id: string;
  question: string;
  placeholder: string;
  category: 'dating' | 'lifestyle' | 'quirks';
}

export const CANONICAL_PERSONALITY_PROMPTS: readonly PersonalityPromptDef[] = [
  {
    id: 'ideal_sunday',
    question: 'My ideal Sunday looks like...',
    placeholder: 'Farmer’s market, pouring a pour-over, and a long walk without looking at my phone.',
    category: 'lifestyle',
  },
  {
    id: 'hyperfixation',
    question: 'A conversation I can never get tired of is...',
    placeholder: 'Architectural history, why great films make us cry, or obscure sci-fi theories.',
    category: 'quirks',
  },
  {
    id: 'best_first_date',
    question: 'A memorable first date would be...',
    placeholder: 'Exploring a neighborhood bookstore followed by unhurried street food and conversation.',
    category: 'dating',
  },
  {
    id: 'learn_together',
    question: 'Something I’d love to learn with someone is...',
    placeholder: 'Pottery throwing, mastering sourdough, or learning to surf in cold water.',
    category: 'lifestyle',
  },
  {
    id: 'feel_most_myself',
    question: 'I feel most like myself when...',
    placeholder: 'Cooked dinner for people I care about, music on, zero pressure.',
    category: 'quirks',
  },
] as const;

export const PersonalityPromptAnswerSchema = z.object({
  promptId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().trim().min(2, 'Answer must be at least 2 characters').max(300, 'Keep within 300 characters'),
});
export type PersonalityPromptAnswer = z.infer<typeof PersonalityPromptAnswerSchema>;
