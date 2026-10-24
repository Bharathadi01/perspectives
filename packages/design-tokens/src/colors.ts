export const colors = {
  background: '#F7F4EE',
  surface: '#FFFFFF',
  /** Quiet fills: inputs, chips, secondary cards. */
  surfaceMuted: '#F1EDE6',
  border: '#E6E1D7',
  ink: '#17171B',
  muted: '#6E6C73',
  /** Text and icons on brand or dark backgrounds. */
  onDark: '#FFFFFF',
  brand: '#5B4BDB',
  brandSoft: '#ECE9FB',
  success: '#287A5B',
  warning: '#B86B20',
  /** Quiet warning fill. Icons and graphics only: warning text on it is under 4.5:1. */
  warningSoft: '#FBF0E2',
  danger: '#B33A3A',
  /** Dark bottom tab bar (Hinge-style interim layout). */
  tabBar: '#17171B',
  tabBarInactive: '#8E8C93',
  /** Scrim behind prompt text on photos and behind sheets. */
  photoScrim: 'rgba(23, 23, 27, 0.45)',
  overlay: 'rgba(23, 23, 27, 0.55)',
  /** Heavier scrim for prompt text sitting on a photo. */
  scrimMedia: 'rgba(23, 23, 27, 0.78)',
  /** Secondary text on a dark or photo background. */
  onDarkMuted: 'rgba(255, 255, 255, 0.72)',
  shadow: '#17171B',
  /** The "you're connected" moment: deep brand background, soft glow and confetti. */
  celebrationBackground: '#2B2266',
  celebrationGlow: 'rgba(236, 233, 251, 0.16)',
  confettiGold: '#F2C14E',
  confettiCoral: '#F78C6B',
  confettiMint: '#7BD3C4',
  confettiLilac: '#ECE9FB',
  /** Small notice banners in chat (for example "Reply soon"). */
  noticeBackground: '#FFF4E5',
} as const;

export type Colors = typeof colors;
