# Design System

## Direction
Target direction: original, warm, editorial, calm, and human. For initial development the layout and interaction should closely follow Hinge (see `PRODUCT.md`), built with our own design tokens and copy. This is a temporary placeholder; the final visual design will be redone by the product owner after the logic is complete, and the Hinge-like UI must be replaced before any public release or store submission.

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
PerspectiveRequestCard (a post card), PersonHeader, PromptBlock, ResponseNote, PrimaryButton, SecondaryButton, SafetyMenu, EmptyState, ModerationBanner, ProfileCompletenessMeter, OriginContextCard (shows the perspective that led to a connection). LensChip is a legacy component; lenses are not part of the core model.

Components the target product needs that the skeleton does not have yet: a profile post card with an audio player (15-second clips), a profile basics row, a spark-hints block under the comment box, quick-pick chips, a daily give progress indicator (mandatory set and unlock), a connect-request sheet (replaces ConnectionIntentSheet; it has no intent picker) and an incoming connect-request card with the attached perspective, and a selfie-verification flow.

## Content language
Use “Give Perspective,” “Perspective,” “Helpful,” and “Connect.” Never say that a response is objective truth. Avoid “rate,” “score this person,” “hot,” or “value.” Never label a connection with an intent such as “date,” “friends,” or “networking”; Connect is open.

## Required states
Every async screen: loading, content, empty, recoverable error, offline, permission denied, blocked, suspended, and removed content. Also: perspectives locked until the daily give is done, daily set completed, a profile with no perspectives yet, selfie verification pending or failed, and connect-request cooldown active.

## Accessibility
Dynamic text, screen-reader labels, logical focus order, contrast validation, reduced motion, no color-only meaning, keyboard handling, and touch targets of at least 48 pixels.
