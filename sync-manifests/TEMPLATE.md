# Sync Manifest: [Feature / Branch Name]

- **Author / Agent:** [Developer Name / Agent Name]
- **Branch:** [e.g., feat/audio-posts]
- **Date & Time:** [ISO timestamp or local date]
- **Base Commit:** [Commit hash branched from]

## 1. Summary of Changes
[2-4 sentences explaining what was built or fixed and why.]

## 2. Modified & Created Files
- `path/to/file.tsx`: [Description of change]

## 3. Database & Schema Changes
- **Prisma Schema Modified:** [Yes / No]
- **New Tables:** [List new tables or "None"]
- **New Columns Added:** [e.g. `User.newField: String?` - must be nullable/defaulted]
- **Migration Name:** [e.g. `202610151430_jana_add_feature`]

## 4. Contract & API Impact
- **New Endpoints:** [e.g. POST /requests/:id/example]
- **DTO Updates:** [List changes made to @perspective/contracts]
- **Breaking Changes:** [NONE - explain why backwards-compatible]

## 5. UI & Design System Adherence
- [ ] All colors imported from `@perspective/design-tokens`
- [ ] Minimum 48px touch targets preserved
- [ ] Reused existing components from `apps/mobile/src/components`

## 6. Verification & Test Evidence
- [ ] `pnpm test` passed
- [ ] `pnpm --filter @perspective/contracts build` succeeded
- [ ] `pnpm --filter @perspective/api build` succeeded
- [ ] Swagger docs verified at `/docs`
- [ ] Mobile screen verified in Expo / Metro without runtime crashes

## 7. Potential Overlap / Conflict Warning
[List any shared files touched so teammate/agent knows where to check.]
