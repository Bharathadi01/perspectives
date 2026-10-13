# Design System

## Direction
Original, warm, editorial, calm, and human. Hinge may inform interaction hierarchy but not visual appearance or wording.

## Tokens
- Background: `#F7F4EE`
- Surface: `#FFFFFF`
- Ink: `#17171B`
- Muted: `#6E6C73`
- Brand: `#5B4BDB`
- Success: `#287A5B`
- Warning: `#B86B20`
- Danger: `#B33A3A`
- Spacing: 4, 8, 12, 16, 24, 32, 48
- Card radius: 24
- Control radius: 14
- Minimum target: 48 logical pixels

Tokens live only in `packages/design-tokens`. Raw repeated colors/spacing in feature code are prohibited.

## Core components
PerspectiveRequestCard, PersonHeader, LensChip, PromptBlock, ResponseNote, PrimaryButton, SecondaryButton, SafetyMenu, ConnectionIntentSheet, EmptyState, ModerationBanner, ProfileCompletenessMeter, OriginContextCard.

## Content language
Use “Give Perspective,” “Perspective Request,” “Helpful,” and “Connect.” Never say that a response is objective truth. Avoid “rate,” “score this person,” “hot,” or “value.”

## Required states
Every async screen: loading, content, empty, recoverable error, offline, permission denied, blocked, suspended, and removed content.

## Accessibility
Dynamic text, screen-reader labels, logical focus order, contrast validation, reduced motion, no color-only meaning, keyboard handling, and touch targets of at least 48 pixels.
