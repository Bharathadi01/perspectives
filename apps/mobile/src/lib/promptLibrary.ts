import { PostCategory } from '@perspective/contracts';

export interface PromptItem {
  id: string;
  category: 'first_impressions' | 'personality' | 'dating' | 'interests' | 'voice';
  postCategory: PostCategory;
  text: string;
  defaultFocusAreas: string[];
}

export const PROMPT_LIBRARY: PromptItem[] = [
  // First Impressions
  {
    id: 'fi_1',
    category: 'first_impressions',
    postCategory: 'looks',
    text: 'What vibe does this photo give you?',
    defaultFocusAreas: ['first_look'],
  },
  {
    id: 'fi_2',
    category: 'first_impressions',
    postCategory: 'looks',
    text: 'What would you notice about me first?',
    defaultFocusAreas: ['first_look', 'presence'],
  },
  {
    id: 'fi_3',
    category: 'first_impressions',
    postCategory: 'looks',
    text: 'What does this picture make you curious about?',
    defaultFocusAreas: ['photo', 'expression'],
  },
  {
    id: 'fi_4',
    category: 'first_impressions',
    postCategory: 'style',
    text: 'What would you assume about me from this outfit?',
    defaultFocusAreas: ['outfit', 'fit'],
  },
  {
    id: 'fi_5',
    category: 'first_impressions',
    postCategory: 'vibe',
    text: 'What kind of energy do I radiate here?',
    defaultFocusAreas: ['energy', 'first_look'],
  },

  // Personality
  {
    id: 'per_1',
    category: 'personality',
    postCategory: 'vibe',
    text: 'What kind of person do I come across as?',
    defaultFocusAreas: ['impression', 'approachable'],
  },
  {
    id: 'per_2',
    category: 'personality',
    postCategory: 'vibe',
    text: 'What stands out most about my personality?',
    defaultFocusAreas: ['standout'],
  },
  {
    id: 'per_3',
    category: 'personality',
    postCategory: 'other',
    text: 'What is something you would want to ask me?',
    defaultFocusAreas: ['take'],
  },
  {
    id: 'per_4',
    category: 'personality',
    postCategory: 'looks',
    text: 'Does this expression feel natural or posed?',
    defaultFocusAreas: ['expression', 'photo'],
  },

  // Dating & Connection
  {
    id: 'date_1',
    category: 'dating',
    postCategory: 'vibe',
    text: 'What kind of first date would you imagine with me?',
    defaultFocusAreas: ['approachable', 'energy'],
  },
  {
    id: 'date_2',
    category: 'dating',
    postCategory: 'vibe',
    text: 'What would make you want to start a conversation?',
    defaultFocusAreas: ['approachable', 'standout'],
  },
  {
    id: 'date_3',
    category: 'dating',
    postCategory: 'style',
    text: 'Would this look work for our first dinner date?',
    defaultFocusAreas: ['occasion', 'outfit'],
  },
  {
    id: 'date_4',
    category: 'dating',
    postCategory: 'other',
    text: 'What would you be most curious to discover about me?',
    defaultFocusAreas: ['take'],
  },

  // Interests & Lifestyle
  {
    id: 'int_1',
    category: 'interests',
    postCategory: 'other',
    text: 'What do you think I enjoy doing on a Sunday morning?',
    defaultFocusAreas: ['take'],
  },
  {
    id: 'int_2',
    category: 'interests',
    postCategory: 'other',
    text: 'What would you want to hear the story behind?',
    defaultFocusAreas: ['take'],
  },
  {
    id: 'int_3',
    category: 'interests',
    postCategory: 'fitness',
    text: 'What does my physique or posture say about my discipline?',
    defaultFocusAreas: ['physique', 'posture'],
  },
  {
    id: 'int_4',
    category: 'interests',
    postCategory: 'style',
    text: 'Do these colors suit my natural tone?',
    defaultFocusAreas: ['colors'],
  },

  // Voice & Energy
  {
    id: 'voice_1',
    category: 'voice',
    postCategory: 'voice',
    text: 'What do you notice about my voice and tone?',
    defaultFocusAreas: ['tone', 'warmth'],
  },
  {
    id: 'voice_2',
    category: 'voice',
    postCategory: 'voice',
    text: 'Do I come across as warm and approachable?',
    defaultFocusAreas: ['warmth', 'confidence'],
  },
  {
    id: 'voice_3',
    category: 'voice',
    postCategory: 'voice',
    text: 'What is your honest impression after hearing this clip?',
    defaultFocusAreas: ['confidence', 'tone'],
  },
];
