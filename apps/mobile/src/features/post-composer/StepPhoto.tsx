import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PickedMedia } from '../../lib/media';
import { theme } from '../../theme';

interface StepPhotoProps {
  photo: PickedMedia | null;
  onPick: () => void;
}

/** Step one, because the photo is the thing people are responding to. */
export function StepPhoto({ photo, onPick }: StepPhotoProps) {
  return (
    <>
      <Pressable
        onPress={onPick}
        accessibilityRole="button"
        accessibilityLabel={photo ? 'Change the photo' : 'Choose a photo'}
        style={({ pressed }) => [s.box, photo ? s.boxFilled : s.boxEmpty, pressed && s.pressed]}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={s.image} accessibilityIgnoresInvertColors />
            <View style={s.change}>
              <Ionicons name="camera-outline" size={theme.iconSize.base} color={theme.editorial.colors.onInk} />
              <Text style={s.changeText}>Change</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.icon}>
              <Ionicons name="image-outline" size={theme.iconSize.hero} color={theme.editorial.colors.accent} />
            </View>
            <Text style={s.title}>Choose a photo</Text>
            <Text style={s.hint}>A clear shot of you works best</Text>
          </>
        )}
      </Pressable>

      <View style={s.note}>
        <Ionicons name="information-circle-outline" size={theme.iconSize.base} color={theme.editorial.colors.muted} />
        <Text style={s.noteText}>Shirtless, gym and swimwear photos are fine. Nothing sexual.</Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  box: {
    height: 420,
    borderRadius: theme.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    overflow: 'hidden',
  },
  boxEmpty: {
    backgroundColor: theme.editorial.colors.surface,
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: theme.editorial.colors.line,
  },
  boxFilled: { backgroundColor: theme.editorial.colors.sand },
  pressed: { opacity: theme.opacity.pressed },
  image: { ...StyleSheet.absoluteFill },
  change: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    height: theme.touchTarget.comfortable - 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.editorial.colors.inkGlass,
  },
  changeText: { ...theme.editorialText.calloutStrong, color: theme.editorial.colors.onInk },
  icon: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.editorial.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...theme.editorialText.bodyStrong, color: theme.editorial.colors.ink },
  hint: { ...theme.editorialText.callout, color: theme.editorial.colors.muted },
  note: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  noteText: { ...theme.editorialText.callout, color: theme.editorial.colors.muted, flex: 1 },
});
