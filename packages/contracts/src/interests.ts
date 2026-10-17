import { z } from 'zod';

export const InterestCategory = z.enum([
  'creativity',
  'music',
  'active_outdoors',
  'food_drink',
  'entertainment',
  'knowledge_tech',
  'vibe_lifestyle',
  'community_values',
]);
export type InterestCategory = z.infer<typeof InterestCategory>;

export interface InterestDefinition {
  id: string;
  label: string;
  category: InterestCategory;
  icon: string;
}

export const INTEREST_CATEGORY_CONFIG: Record<
  InterestCategory,
  { label: string; icon: string; description: string }
> = {
  creativity: { label: 'Art & Creativity', icon: 'brush-outline', description: 'Design, visual arts, crafts' },
  music: { label: 'Music & Audio', icon: 'musical-notes-outline', description: 'Gigs, genres, soundscapes' },
  active_outdoors: { label: 'Active & Outdoors', icon: 'fitness-outline', description: 'Movement, nature, sports' },
  food_drink: { label: 'Food & Drink', icon: 'restaurant-outline', description: 'Culinary, coffee, cocktails' },
  entertainment: { label: 'Entertainment', icon: 'film-outline', description: 'Cinema, comedy, gaming' },
  knowledge_tech: { label: 'Knowledge & Tech', icon: 'book-outline', description: 'Ideas, science, tech' },
  vibe_lifestyle: { label: 'Vibe & Lifestyle', icon: 'sparkles-outline', description: 'Rhythms, travel, fashion' },
  community_values: { label: 'Community & Impact', icon: 'heart-outline', description: 'Sustainability, causes' },
};

export const CANONICAL_INTERESTS: readonly InterestDefinition[] = [
  // Creativity
  { id: 'art_design', label: 'Art & Design', category: 'creativity', icon: 'color-palette-outline' },
  { id: 'photography', label: 'Photography', category: 'creativity', icon: 'camera-outline' },
  { id: 'writing_poetry', label: 'Writing & Poetry', category: 'creativity', icon: 'document-text-outline' },
  { id: 'architecture', label: 'Architecture', category: 'creativity', icon: 'business-outline' },
  { id: 'crafting_diy', label: 'Crafting & DIY', category: 'creativity', icon: 'cut-outline' },

  // Music
  { id: 'live_gigs', label: 'Live Gigs & Concerts', category: 'music', icon: 'mic-outline' },
  { id: 'indie_alt', label: 'Indie & Alternative', category: 'music', icon: 'disc-outline' },
  { id: 'electronic_techno', label: 'Electronic & Techno', category: 'music', icon: 'radio-outline' },
  { id: 'hip_hop_rnb', label: 'Hip-Hop & R&B', category: 'music', icon: 'headset-outline' },
  { id: 'jazz_soul', label: 'Jazz & Soul', category: 'music', icon: 'musical-note-outline' },
  { id: 'classical', label: 'Classical & Ambient', category: 'music', icon: 'volume-high-outline' },

  // Active & Outdoors
  { id: 'hiking_trails', label: 'Hiking & Trails', category: 'active_outdoors', icon: 'trail-sign-outline' },
  { id: 'running', label: 'Running', category: 'active_outdoors', icon: 'walk-outline' },
  { id: 'yoga_pilates', label: 'Yoga & Pilates', category: 'active_outdoors', icon: 'body-outline' },
  { id: 'gym_lifting', label: 'Gym & Lifting', category: 'active_outdoors', icon: 'barbell-outline' },
  { id: 'cycling', label: 'Cycling & Commuting', category: 'active_outdoors', icon: 'bicycle-outline' },
  { id: 'bouldering_climbing', label: 'Bouldering & Climbing', category: 'active_outdoors', icon: 'triangle-outline' },
  { id: 'surfing_ocean', label: 'Surfing & Ocean', category: 'active_outdoors', icon: 'water-outline' },

  // Food & Drink
  { id: 'specialty_coffee', label: 'Specialty Coffee', category: 'food_drink', icon: 'cafe-outline' },
  { id: 'home_cooking', label: 'Home Cooking', category: 'food_drink', icon: 'restaurant-outline' },
  { id: 'natural_wine', label: 'Natural Wine', category: 'food_drink', icon: 'wine-outline' },
  { id: 'street_food', label: 'Street Food & Markets', category: 'food_drink', icon: 'fast-food-outline' },
  { id: 'baking', label: 'Baking & Pastry', category: 'food_drink', icon: 'pizza-outline' },
  { id: 'craft_cocktails', label: 'Craft Cocktails', category: 'food_drink', icon: 'beer-outline' },

  // Entertainment
  { id: 'cinema_film', label: 'Cinema & Arthouse', category: 'entertainment', icon: 'film-outline' },
  { id: 'video_games', label: 'Video Games', category: 'entertainment', icon: 'game-controller-outline' },
  { id: 'standup_comedy', label: 'Stand-Up Comedy', category: 'entertainment', icon: 'happy-outline' },
  { id: 'anime_manga', label: 'Anime & Manga', category: 'entertainment', icon: 'tv-outline' },
  { id: 'board_games', label: 'Board Games & Trivia', category: 'entertainment', icon: 'cube-outline' },
  { id: 'theatre_stage', label: 'Theatre & Stage', category: 'entertainment', icon: 'ticket-outline' },

  // Knowledge & Tech
  { id: 'startups_tech', label: 'Startups & Tech', category: 'knowledge_tech', icon: 'hardware-chip-outline' },
  { id: 'philosophy', label: 'Philosophy & Ethics', category: 'knowledge_tech', icon: 'bulb-outline' },
  { id: 'podcasts', label: 'Podcasts & Longform', category: 'knowledge_tech', icon: 'mic-circle-outline' },
  { id: 'science_nature', label: 'Science & Cosmos', category: 'knowledge_tech', icon: 'planet-outline' },
  { id: 'books_reading', label: 'Books & Literature', category: 'knowledge_tech', icon: 'book-outline' },
  { id: 'psychology', label: 'Human Behavior & Psych', category: 'knowledge_tech', icon: 'eye-outline' },

  // Vibe & Lifestyle
  { id: 'travel_backpacking', label: 'Travel & Backpacking', category: 'vibe_lifestyle', icon: 'airplane-outline' },
  { id: 'mindfulness', label: 'Meditation & Mindfulness', category: 'vibe_lifestyle', icon: 'flower-outline' },
  { id: 'vintage_thrifting', label: 'Vintage & Thrifting', category: 'vibe_lifestyle', icon: 'shirt-outline' },
  { id: 'road_trips', label: 'Road Trips & Vanlife', category: 'vibe_lifestyle', icon: 'car-outline' },
  { id: 'plant_parent', label: 'Plant Parent & Gardening', category: 'vibe_lifestyle', icon: 'leaf-outline' },
  { id: 'music_festivals', label: 'Music Festivals', category: 'vibe_lifestyle', icon: 'flame-outline' },

  // Community & Impact
  { id: 'volunteering', label: 'Volunteering & Mutual Aid', category: 'community_values', icon: 'hand-left-outline' },
  { id: 'climate_sustainability', label: 'Climate & Sustainability', category: 'community_values', icon: 'earth-outline' },
  { id: 'animal_welfare', label: 'Animal Welfare & Pets', category: 'community_values', icon: 'paw-outline' },
] as const;

export const ALL_INTEREST_IDS = CANONICAL_INTERESTS.map((i) => i.id) as [string, ...string[]];

export const InterestIdSchema = z.string().refine((id) => CANONICAL_INTERESTS.some((i) => i.id === id), {
  message: 'Invalid interest ID',
});

export const SelectedInterestsSchema = z
  .array(InterestIdSchema)
  .min(3, 'Select at least 3 interests')
  .max(10, 'Maximum 10 interests allowed')
  .refine((arr) => new Set(arr).size === arr.length, 'Duplicate interests are not allowed');

export function getInterestById(id: string): InterestDefinition | undefined {
  return CANONICAL_INTERESTS.find((i) => i.id === id);
}

export function getInterestsByCategory(category: InterestCategory): InterestDefinition[] {
  return CANONICAL_INTERESTS.filter((i) => i.category === category);
}
