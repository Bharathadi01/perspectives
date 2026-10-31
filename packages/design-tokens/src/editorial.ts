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
    /** Chips on an ink card; the resting tab-bar selection. */
    onInkSoft: 'rgba(246,241,231,0.12)',
    /** Secondary text and icons on ink (about 9:1). */
    onInkMuted: 'rgba(246,241,231,0.72)',
    /** Hairlines and the lifted lens's rim on ink. */
    onInkLine: 'rgba(246,241,231,0.24)',
    /** The tab bar's fill where there is no native glass: ink, barely see-through. */
    inkGlass: 'rgba(36,29,21,0.94)',
    /** The tab bar's lens while it is lifted and moving. */
    onInkLens: 'rgba(246,241,231,0.14)',
    /** Played part of a voice waveform, unplayed part. */
    wavePlayed: '#241D15',
    waveRest: '#D9CDB8',
    /** Quiet fills on paper: chips, note boxes, the back cards of a stack. */
    sand: '#EFE7D8',
    /** The unchosen side of a segmented switch. */
    sandDeep: '#EDE5D6',
    /** Small clay labels on paper or white (about 6:1; the accent itself is under 4.5:1 for text). */
    accentText: '#9A4222',
    /** Wheel-picker rows one step away from the chosen value. */
    faint: '#B3A792',
    /** Behind a sheet on paper. */
    scrim: 'rgba(36,29,21,0.42)',
    /** The soft ring that pulses out of a button to say "tap me next". */
    accentGlow: 'rgba(181,80,42,0.45)',
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
