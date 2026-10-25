/**
 * The editorial look (chosen 2026-10-25 for the Explore screen first): warm paper, dark brown ink,
 * a clay accent, Fraunces for names and questions and Inter for text. Other screens still use
 * `colors` and the system font until the look is rolled out.
 */
export const editorial = {
  colors: {
    paper: '#F6F1E7',
    surface: '#FFFFFF',
    ink: '#241D15',
    /** Secondary text on paper (about 5:1). */
    muted: '#6E6456',
    line: '#E3D8C3',
    /** The verified tick and other small accents. */
    accent: '#B5502A',
    /** Text and icons on ink. */
    onInk: '#F6F1E7',
    /** Chips on an ink card. */
    onInkSoft: 'rgba(246,241,231,0.12)',
    /** Played part of a voice waveform, unplayed part. */
    wavePlayed: '#241D15',
    waveRest: '#D9CDB8',
  },
  /** Font family names as loaded in apps/mobile/app/_layout.tsx (one family per weight). */
  fonts: {
    display: 'Fraunces_600SemiBold',
    displayItalic: 'Fraunces_500Medium_Italic',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemibold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
  },
} as const;

export type Editorial = typeof editorial;
