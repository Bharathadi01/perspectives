import { CONVERSATION_IDEAS, conversationIdeas, type ConversationRole, type PostCategory } from '@perspective/contracts';

/**
 * A first line for each conversation idea. The ideas read as advice ("Ask what
 * got them into it"); tapping one puts its line in the message box so the
 * person can make it theirs before sending. Lines that end in a space are
 * openings to finish ("The first word that came to mind was "). All of them
 * are written by hand; nothing is generated.
 */
export const STARTER: Readonly<Record<string, string>> = {
  // Shared, when someone gave a perspective on your post
  'Thank them for the honest take, and ask what made them say it.': 'Thanks for the honest take. What made you say that?',
  'Tell them which part of their perspective stuck with you.': 'The part of your perspective that stuck with me was ',
  // style
  'Ask what the outfit was for.': 'Okay, what was the outfit for?',
  'Ask where they like to shop.': 'Where do you usually shop?',
  'Ask what they would never wear.': 'What would you never wear?',
  'Tell them which piece caught your eye, and ask about it.': 'The piece that caught my eye was ',
  'Ask how they would describe their style in three words.': 'Your style in three words. Go.',
  'Ask what they would change about the look.': 'What would you change about the look?',
  'Ask about their own go-to outfit.': 'What is your own go-to outfit?',
  // grooming
  'Ask how long they have had this look.': 'How long have you had this look?',
  'Ask if they are thinking of changing it.': 'Are you thinking of changing it up?',
  'Ask who does their hair, or if they do it themselves.': 'Who does your hair, or is that all you?',
  'Tell them what you think suits them most, and ask what they think.': 'I think what suits you most is ',
  'Ask what look they would try if they were you.': 'If you were me, what look would you try?',
  'Ask about their own grooming routine.': 'What does your own routine look like?',
  // fitness
  'Ask what their training looks like these days.': 'What does your training look like these days?',
  'Ask what got them started.': 'What got you started?',
  'Ask what goal they are working towards.': 'What are you working towards right now?',
  'Ask what keeps them consistent.': 'What keeps you consistent?',
  'Ask if they train too, and what they enjoy.': 'Do you train too? What do you enjoy?',
  'Ask what advice they would give someone starting out.': 'What would you tell someone just starting out?',
  // looks
  'Ask where the photo was taken.': 'Where was that photo taken?',
  'Ask what was happening just before the photo.': 'What was happening just before that photo?',
  'Tell them what stood out first, and ask about it.': 'The first thing that stood out to me was ',
  'Ask if this photo feels like the real them.': 'Does that photo feel like the real you?',
  'Ask what you would see in person that the photo misses.': 'What would I notice in person that the photo misses?',
  'Ask which of your photos they liked most.': 'Which of my photos did you like most?',
  // voice
  'Tell them what you liked about how they sound, and ask how they feel about their own voice.':
    'I liked how you sound. How do you feel about your own voice?',
  'Ask if they have always sounded like that.': 'Have you always sounded like that?',
  'Ask what they were talking about in the clip.': 'What were you talking about in the clip?',
  'Ask if they prefer voice notes or texting.': 'Voice notes or texting?',
  'Ask what they noticed first in your voice.': 'What did you notice first in my voice?',
  'Ask if they would send a voice note back.': 'Would you send a voice note back?',
  // vibe
  'Tell them the first word that came to mind, and ask if it fits.': 'The first word that came to mind was ',
  'Ask what a typical day looks like for them.': 'What does a typical day look like for you?',
  'Ask what people usually get wrong about them.': 'What do people usually get wrong about you?',
  'Ask what puts them in a good mood.': 'What puts you in a good mood?',
  'Ask what their own vibe is, in their words.': 'How would you describe your own vibe?',
  'Ask what made them stop on your profile.': 'What made you stop on my profile?',
  // personality
  'Ask what makes them laugh.': 'What makes you laugh?',
  'Ask how their friends would describe them.': 'How would your friends describe you?',
  'Ask what they care about most these days.': 'What do you care about most these days?',
  'Ask about something that surprised people about them.': 'What is something about you that surprises people?',
  'Ask how they would describe themselves.': 'How would you describe yourself?',
  'Ask what kind of people they get along with best.': 'What kind of people do you get along with best?',
  // profile
  'Ask about the detail in their profile that made you curious.': 'I have to ask about ',
  'Ask what they wish people asked them more.': 'What do you wish people asked you more?',
  'Ask what they are into right now.': 'What are you into right now?',
  'Ask what a perfect weekend looks like for them.': 'What does a perfect weekend look like for you?',
  'Ask what they would want to know about you.': 'What would you want to know about me?',
  'Ask what is missing from their own profile.': 'What is missing from your own profile?',
  // interests
  'Ask what got them into it.': 'What got you into it?',
  'Ask what they love most about it.': 'What do you love most about it?',
  'Ask how long they have been doing it.': 'How long have you been doing it?',
  'Ask how they would get a beginner started.': 'How would you get a beginner started?',
  'Ask about the best moment they have had with it.': 'What is the best moment you have had with it?',
  'Ask what they are into.': 'What are you into?',
  'Ask if they have ever tried your interest.': 'Have you ever tried it yourself?',
  // lifestyle
  'Ask about the best place they have been.': 'What is the best place you have been?',
  'Ask where this was, and what they did there.': 'Where was this, and what did you get up to?',
  'Ask what their ideal weekend looks like.': 'What does your ideal weekend look like?',
  'Ask where they want to go next.': 'Where do you want to go next?',
  'Ask about their favourite place to spend a day.': 'Where is your favourite place to spend a day?',
  'Ask what they would do on a free weekend.': 'What would you do with a free weekend?',
  // other
  'Ask the question you were most curious about.': 'I have been curious about ',
  'Ask what made them post this.': 'What made you post this?',
  'Ask what they hoped people would say.': 'What were you hoping people would say?',
  'Ask what made them pick your post.': 'What made you pick my post?',
};

/** The line an idea puts in the message box, or null if it has none (it then stays a hint). */
export function starterFor(idea: string): string | null {
  return STARTER[idea] ?? null;
}

/** How many ideas exist for this chat, so Shuffle only shows when there is something new to see. */
export function ideaCount(category: PostCategory, role: ConversationRole): number {
  return CONVERSATION_IDEAS[category][role].length;
}

/**
 * The ideas for one round of Shuffle. Round 0 is what the chat always opens
 * with; each later round starts three ideas further on, so a shuffle never
 * repeats the set on screen until the list wraps around.
 */
export function ideasForRound(category: PostCategory, role: ConversationRole, seed: string, round: number, count = 3): string[] {
  const all = CONVERSATION_IDEAS[category][role];
  const first = conversationIdeas(category, role, seed, count);
  if (round === 0 || all.length <= count) return first;
  const start = (all.indexOf(first[0]) + round * count) % all.length;
  return Array.from({ length: Math.min(count, all.length) }, (_, i) => all[(start + i) % all.length]);
}
