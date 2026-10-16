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
Built (in `apps/mobile/src/components`): ui (Button, IconButton, Chip, TextField, Sheet, Toast, Screen, States, Text), profile (ProfileView, PostCard with photo and audio, BasicsRow, Avatar), perspective (PerspectiveCard, DailyProgress), forms (BasicsForm, AudienceForm, SelfieStep, PostForm), and SafetyMenu. Reuse these before creating new ones. They are a temporary Hinge-like look (ADR-011).

Not built yet: a dedicated spark-hints block and connect-request sheet (currently inside the composer and profile screens), a moderation banner, a profile completeness meter, a real selfie-camera flow (the simulator has no camera), and dark mode.

## Content language
Use “Give Perspective,” “Perspective,” “Helpful,” and “Connect.” Never say that a response is objective truth. Avoid “rate,” “score this person,” “hot,” or “value.” Never label a connection with an intent such as “date,” “friends,” or “networking”; Connect is open.

## Required states
Every async screen: loading, content, empty, recoverable error, offline, permission denied, blocked, suspended, and removed content. Also: perspectives locked until the daily give is done, daily set completed, a profile with no perspectives yet, selfie verification pending or failed, and connect-request cooldown active.

## Accessibility
Dynamic text, screen-reader labels, logical focus order, contrast validation, reduced motion, no color-only meaning, keyboard handling, and touch targets of at least 48 pixels.
