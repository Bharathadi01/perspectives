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
              <Ionicons name="camera-outline" size={theme.iconSize.base} color={theme.colors.onDark} />
              <Text style={s.changeText}>Change</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.icon}>
              <Ionicons name="image-outline" size={theme.iconSize.hero} color={theme.colors.brand} />
            </View>
            <Text style={s.title}>Choose a photo</Text>
            <Text style={s.hint}>A clear shot of you works best</Text>
          </>
        )}
      </Pressable>

      <View style={s.note}>
        <Ionicons name="information-circle-outline" size={theme.iconSize.base} color={theme.colors.muted} />
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
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  boxFilled: { backgroundColor: theme.colors.surfaceMuted },
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
    backgroundColor: theme.colors.overlay,
  },
  changeText: { ...theme.textStyles.calloutStrong, color: theme.colors.onDark },
  icon: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...theme.textStyles.bodyStrong, color: theme.colors.ink },
  hint: { ...theme.textStyles.callout, color: theme.colors.muted },
  note: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  noteText: { ...theme.textStyles.callout, color: theme.colors.muted, flex: 1 },
});
