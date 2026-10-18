import type { PostCategory } from './post';

/**
 * Conversation ideas shown in an empty chat right after two people connect. They are guidance
 * ("Ask what got them into it"), never a ready-made message: the person writes their own words.
 *
 * - `giver`: the person who wrote the perspective that led to the connection.
 * - `owner`: the person whose post received that perspective.
 *
 * Hard-coded on purpose (no LLM): they need only the post's category, so no private text from the
 * perspective is reused or sent anywhere.
 */
export type ConversationRole = 'giver' | 'owner';

type IdeaSet = Record<ConversationRole, readonly string[]>;

const SHARED_OWNER = [
  'Thank them for the honest take, and ask what made them say it.',
  'Tell them which part of their perspective stuck with you.',
];

export const CONVERSATION_IDEAS: Record<PostCategory, IdeaSet> = {
  style: {
    giver: [
      'Ask what the outfit was for.',
      'Ask where they like to shop.',
      'Ask what they would never wear.',
      'Tell them which piece caught your eye, and ask about it.',
      'Ask how they would describe their style in three words.',
    ],
    owner: [...SHARED_OWNER, 'Ask what they would change about the look.', 'Ask about their own go-to outfit.'],
  },
  grooming: {
    giver: [
      'Ask how long they have had this look.',
      'Ask if they are thinking of changing it.',
      'Ask who does their hair, or if they do it themselves.',
      'Tell them what you think suits them most, and ask what they think.',
    ],
    owner: [...SHARED_OWNER, 'Ask what look they would try if they were you.', 'Ask about their own grooming routine.'],
  },
  fitness: {
    giver: [
      'Ask what their training looks like these days.',
      'Ask what got them started.',
      'Ask what goal they are working towards.',
      'Ask what keeps them consistent.',
    ],
    owner: [...SHARED_OWNER, 'Ask if they train too, and what they enjoy.', 'Ask what advice they would give someone starting out.'],
  },
  looks: {
    giver: [
      'Ask where the photo was taken.',
      'Ask what was happening just before the photo.',
      'Tell them what stood out first, and ask about it.',
      'Ask if this photo feels like the real them.',
    ],
    owner: [...SHARED_OWNER, 'Ask what you would see in person that the photo misses.', 'Ask which of your photos they liked most.'],
  },
  voice: {
    giver: [
      'Tell them what you liked about how they sound, and ask how they feel about their own voice.',
      'Ask if they have always sounded like that.',
      'Ask what they were talking about in the clip.',
      'Ask if they prefer voice notes or texting.',
    ],
    owner: [...SHARED_OWNER, 'Ask what they noticed first in your voice.', 'Ask if they would send a voice note back.'],
  },
  vibe: {
    giver: [
      'Tell them the first word that came to mind, and ask if it fits.',
      'Ask what a typical day looks like for them.',
      'Ask what people usually get wrong about them.',
      'Ask what puts them in a good mood.',
    ],
    owner: [...SHARED_OWNER, 'Ask what their own vibe is, in their words.', 'Ask what made them stop on your profile.'],
  },
  personality: {
    giver: [
      'Ask what makes them laugh.',
      'Ask how their friends would describe them.',
      'Ask what they care about most these days.',
      'Ask about something that surprised people about them.',
    ],
    owner: [...SHARED_OWNER, 'Ask how they would describe themselves.', 'Ask what kind of people they get along with best.'],
  },
  profile: {
    giver: [
      'Ask about the detail in their profile that made you curious.',
      'Ask what they wish people asked them more.',
      'Ask what they are into right now.',
      'Ask what a perfect weekend looks like for them.',
    ],
    owner: [...SHARED_OWNER, 'Ask what they would want to know about you.', 'Ask what is missing from their own profile.'],
  },
  interests: {
    giver: [
      'Ask what got them into it.',
      'Ask what they love most about it.',
      'Ask how long they have been doing it.',
      'Ask how they would get a beginner started.',
      'Ask about the best moment they have had with it.',
    ],
    owner: [...SHARED_OWNER, 'Ask what they are into.', 'Ask if they have ever tried your interest.'],
  },
  lifestyle: {
    giver: [
      'Ask about the best place they have been.',
      'Ask where this was, and what they did there.',
      'Ask what their ideal weekend looks like.',
      'Ask where they want to go next.',
    ],
    owner: [...SHARED_OWNER, 'Ask about their favourite place to spend a day.', 'Ask what they would do on a free weekend.'],
  },
  other: {
    giver: [
      'Ask the question you were most curious about.',
      'Ask what made them post this.',
      'Ask what they hoped people would say.',
    ],
    owner: [...SHARED_OWNER, 'Ask what made them pick your post.'],
  },
};

/**
 * Up to `count` ideas for this category and role. `seed` (for example the connection id) picks a
 * stable starting point, so the same chat always shows the same ideas and they never flicker.
 */
export function conversationIdeas(category: PostCategory, role: ConversationRole, seed = '', count = 3): string[] {
  const list = CONVERSATION_IDEAS[category][role];
  if (list.length <= count) return [...list];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const start = hash % list.length;
  return Array.from({ length: count }, (_, i) => list[(start + i) % list.length]);
}
