import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_CATALOG, RULES, type PostCategory } from '@perspective/contracts';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PickedMedia } from '../../lib/media';
import { theme } from '../../theme';
import { FieldCard } from '../onboarding/ui';

interface StepQuestionProps {
  /** Shown as a thumbnail so you can see what you are asking about. */
  photo?: PickedMedia | null;
  prompt: string;
  category: PostCategory;
  focusAreas: readonly string[];
  lockCategory?: boolean;
  onChangePrompt: (prompt: string) => void;
  onOpenLibrary: () => void;
  onOpenCategory: () => void;
  onOpenFocus: () => void;
  onChangePhoto?: () => void;
}

export function StepQuestion({
  photo,
  prompt,
  category,
  focusAreas,
  lockCategory,
  onChangePrompt,
  onOpenLibrary,
  onOpenCategory,
  onOpenFocus,
  onChangePhoto,
}: StepQuestionProps) {
  const focusCount = focusAreas.length;

  return (
    <>
      {photo && onChangePhoto ? (
        <Pressable
          onPress={onChangePhoto}
          accessibilityRole="button"
          accessibilityLabel="Change the photo"
          style={({ pressed }) => [s.row, pressed && s.pressed]}
        >
          <Image source={{ uri: photo.uri }} style={s.thumb} accessibilityIgnoresInvertColors />
          <View style={s.rowText}>
            <Text style={s.kicker}>YOUR PHOTO</Text>
            <Text style={s.rowSub}>Tap to change</Text>
          </View>
          <Ionicons name="chevron-forward" size={theme.iconSize.md} color={theme.editorial.colors.muted} />
        </Pressable>
      ) : null}

      <FieldCard
        label="Your question"
        big
        multiline
        delay={0}
        value={prompt}
        onChangeText={onChangePrompt}
        placeholder="What do you want people to tell you?"
        maxLength={RULES.promptMaxLength}
        count={
          prompt.trim().length < RULES.promptMinLength
            ? `At least ${RULES.promptMinLength} · ${prompt.length} / ${RULES.promptMaxLength}`
            : `${prompt.length} / ${RULES.promptMaxLength}`
        }
      />

      <Pressable
        onPress={onOpenLibrary}
        accessibilityRole="button"
        accessibilityLabel="Browse questions"
        style={({ pressed }) => [s.link, pressed && s.pressed]}
      >
        <Ionicons name="sparkles-outline" size={theme.iconSize.base} color={theme.editorial.colors.accent} />
        <Text style={s.linkText}>Browse questions</Text>
      </Pressable>

      {lockCategory ? null : (
        <Pressable
          onPress={onOpenCategory}
          accessibilityRole="button"
          accessibilityLabel={`Category, ${CATEGORY_CATALOG[category].label}`}
          style={({ pressed }) => [s.row, pressed && s.pressed]}
        >
          <View style={s.rowText}>
            <Text style={s.kicker}>CATEGORY</Text>
            <Text style={s.rowValue}>{CATEGORY_CATALOG[category].label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={theme.iconSize.md} color={theme.editorial.colors.muted} />
        </Pressable>
      )}

      <Pressable
        onPress={onOpenFocus}
        accessibilityRole="button"
        accessibilityLabel={`What should people focus on, ${focusCount} chosen`}
        style={({ pressed }) => [s.row, pressed && s.pressed]}
      >
        <View style={s.rowText}>
          <Text style={s.rowValue}>What should people focus on?</Text>
          <Text style={s.rowSub}>{`Optional · ${focusCount} chosen`}</Text>
        </View>
        <Ionicons name="chevron-forward" size={theme.iconSize.md} color={theme.editorial.colors.muted} />
      </Pressable>
    </>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.touchTarget.min + 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.editorial.colors.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.editorial.colors.line,
    borderRadius: theme.radius.control,
  },
  pressed: { opacity: theme.opacity.pressed },
  thumb: { width: 54, height: 54, borderRadius: theme.radius.sm, backgroundColor: theme.editorial.colors.sand },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  kicker: { ...theme.editorialText.overline, color: theme.editorial.colors.muted },
  rowValue: { ...theme.editorialText.bodyStrong, fontSize: theme.typography.fontSize.sm, color: theme.editorial.colors.ink },
  rowSub: { ...theme.editorialText.callout, color: theme.editorial.colors.muted },
  link: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.touchTarget.comfortable },
  linkText: { ...theme.editorialText.calloutStrong, fontSize: theme.typography.fontSize.base, color: theme.editorial.colors.ink },
});
