import Ionicons from '@expo/vector-icons/Ionicons';
import type { MyProfile } from '@perspective/contracts';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { PaperSheet, SheetAction } from '../../../components/editorial/PaperSheet';
import { setBusy } from '../../../lib/busyFlag';
import { DEV_SELFIE_PNG } from '../../../lib/devSelfie';
import { errorMessage } from '../../../lib/errors';
import { success, warn } from '../../../lib/haptics';
import { pickPhoto } from '../../../lib/media';
import { theme } from '../../../theme';
import { useUploadMedia, useVerifySelfie } from '../../hooks';
import { MarchingOval, VerifiedSeal } from '../art';
import { Animate, Float, Pop, PulseRing, Rise, Tap, keyframes } from '../motion';
import { stepHref, useStepNav } from '../nav';
import { formatFeetInchesPrimes } from '../values';
import { BackButton, PillButton, TextButton, ob } from '../ui';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

// ---------- 20 · why the selfie ----------

const SAFETY_POINTS: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'person-circle-outline', text: 'Everyone here is 18 or older and has passed a selfie check.' },
  { icon: 'lock-closed-outline', text: 'Your selfie is never shown on your profile or to anyone.' },
  { icon: 'chatbubble-ellipses-outline', text: 'Perspectives are checked before they’re delivered. Body shaming, abuse and sexual content aren’t allowed.' },
  { icon: 'flag-outline', text: 'You can report or block anyone from their profile or your chat with them.' },
  { icon: 'trash-outline', text: 'You can delete your account at any time in Settings.' },
];

export function SelfieIntro() {
  const { goTo } = useStepNav('selfie');
  const insets = useSafeAreaInsets();
  const [safety, setSafety] = useState(false);
  return (
    <View style={[s.centerScreen, { paddingTop: insets.top + 64, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <Pop delay={100} duration={700} style={s.phoneDisc} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Float duration={4000} delay={1000} distance={8}>
          <View style={s.phoneArt}>
            <Svg width={120} height={140} viewBox="0 0 120 140" fill="none">
              <Rect x={28} y={8} width={64} height={124} rx={14} stroke={c.ink} strokeWidth={3} />
              <Path d="M50 18h20" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
              <Path d="M52 64h0M68 64h0" stroke={c.ink} strokeWidth={4} strokeLinecap="round" />
              <Path d="M53 76c4 4 10 4 14 0" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
            </Svg>
            {/* The dashed face guide, its dashes marching like the camera's. */}
            <View style={s.guide}>
              <MarchingOval width={46} height={58} dash={6} gap={5} duration={1600} />
            </View>
            <Pop delay={1000} style={s.badge}>
              <Svg width={28} height={28} viewBox="0 0 28 28">
                <Circle cx={14} cy={14} r={14} fill={c.accent} />
                <Path d="M8 14l4 4 8-9" stroke={c.onInk} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </Pop>
          </View>
        </Float>
      </Pop>
      <Rise delay={300}>
        <Text style={[ob.bigTitle, s.introTitle]} accessibilityRole="header">
          Keep Perspective real
        </Text>
      </Rise>
      <Rise delay={400}>
        <Text style={[ob.body, s.introBody]}>
          Everyone here is a verified adult. Take a quick selfie so we can check it’s really you.
        </Text>
      </Rise>
      <Rise delay={500}>
        <Text style={[ob.bodyMuted, s.introMuted]}>
          Your selfie stays private. It’s never shown on your profile or to anyone. Once it’s checked, a tick appears next to your name.
        </Text>
      </Rise>
      <View style={s.flex} />
      <TextButton label="How we keep you safe" underline onPress={() => setSafety(true)} />
      <PillButton
        label="Take a selfie"
        icon="camera-outline"
        onPress={() => goTo('selfie-camera')}
        delay={700}
        pulseDelay={1500}
        style={s.takeSelfie}
      />
      <PaperSheet visible={safety} onClose={() => setSafety(false)} title="How we keep you safe">
        <View style={s.points}>
          {SAFETY_POINTS.map((p) => (
            <View key={p.text} style={s.point}>
              <Ionicons name={p.icon} size={20} color={c.accent} />
              <Text style={s.pointText}>{p.text}</Text>
            </View>
          ))}
        </View>
        <SheetAction label="Got it" tone="primary" onPress={() => setSafety(false)} />
      </PaperSheet>
    </View>
  );
}

// ---------- 21 · the camera ----------

const OVAL_W = 270;
const OVAL_H = 350;
const FACE_W = 236;
const FACE_H = 316;

/**
 * The selfie screen. The shutter opens the phone's front camera (a file picker on the web); the
 * photo goes to the selfie check, which is a stub on the server today. In development a "Dev"
 * button passes the check without a camera.
 */
export function SelfieCamera() {
  const insets = useSafeAreaInsets();
  const upload = useUploadMedia();
  const verify = useVerifySelfie();
  const [error, setError] = useState<string | null>(null);
  const busy = upload.isPending || verify.isPending;

  // Nothing may interrupt someone mid-selfie (the "you're connected" moment waits).
  useEffect(() => {
    setBusy('selfie-verification', true);
    return () => setBusy('selfie-verification', false);
  }, []);

  const check = async (photo: { mimeType: string; dataBase64: string }) => {
    const { mediaId } = await upload.run({ kind: 'photo', mimeType: photo.mimeType, dataBase64: photo.dataBase64 });
    const me = await verify.run(mediaId);
    if (me.selfieStatus === 'verified') {
      success();
      // No way back to the camera once verified.
      router.replace(stepHref('verified'));
    } else {
      warn();
      setError('We couldn’t verify that selfie. Try again in good light, facing the camera.');
    }
  };

  const shoot = async () => {
    setError(null);
    try {
      const photo = await pickPhoto('camera');
      if (photo) await check(photo);
    } catch (err) {
      warn();
      setError(err instanceof Error && !('code' in err) ? err.message : errorMessage(err));
    }
  };

  const devPass = async () => {
    setError(null);
    try {
      await check({ mimeType: 'image/png', dataBase64: DEV_SELFIE_PNG });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <View style={[s.cameraScreen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 28 }]}>
      <View style={s.cameraHeader}>
        <BackButton icon="close" label="Close camera" />
        {__DEV__ ? (
          <Tap
            onPress={() => void devPass()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Dev: mark me as verified"
            accessibilityHint="Development builds only. Skips the camera."
            style={s.dev}
          >
            <Ionicons name="construct-outline" size={15} color={c.ink} />
            <Text style={s.devText}>Dev</Text>
          </Tap>
        ) : null}
      </View>
      <Rise duration={600}>
        <Text style={s.cameraTitle} accessibilityRole="header">
          Fit your face in the oval
        </Text>
      </Rise>
      <Rise delay={80} duration={600}>
        <Text style={s.cameraSub}>Good light, no sunglasses, just you.</Text>
      </Rise>
      <Rise delay={150} style={s.ovalBox}>
        <View style={StyleSheet.absoluteFill}>
          <MarchingOval width={OVAL_W} height={OVAL_H} dash={10} gap={9} duration={2600} />
        </View>
        <View style={s.face} accessible accessibilityRole="image" accessibilityLabel="Your face goes here">
          <Svg width={FACE_W} height={FACE_H} viewBox={`0 0 ${FACE_W} ${FACE_H}`} style={StyleSheet.absoluteFill}>
            <Ellipse cx={FACE_W / 2} cy={FACE_H / 2} rx={FACE_W / 2} ry={FACE_H / 2} fill={c.sand} />
          </Svg>
          <Svg width={96} height={118} viewBox="0 0 90 110" fill="none">
            <Circle cx={45} cy={38} r={26} stroke={c.waveRest} strokeWidth={3} />
            <Path d="M8 108c4-24 20-36 37-36s33 12 37 36" stroke={c.waveRest} strokeWidth={3} strokeLinecap="round" />
          </Svg>
          <Animate
            frames={keyframes.scan(FACE_H * 0.56)}
            duration={2600}
            iterations="infinite"
            easing="ease-in-out"
            style={s.scanLine}
          />
        </View>
      </Rise>
      <View style={s.flex} />
      {error ? (
        <Rise duration={300} distance={8}>
          <Text style={[ob.error, s.cameraError]} accessibilityRole="alert">
            {error}
          </Text>
        </Rise>
      ) : null}
      <View style={s.privateRow}>
        <Ionicons name="lock-closed-outline" size={14} color={c.muted} />
        <Text style={s.privateText}>{busy ? 'Checking it’s you…' : 'Private. Only used to verify you.'}</Text>
      </View>
      <View style={s.shutterWrap}>
        {!busy ? <PulseRing width={78} height={78} radius={39} delay={1000} iterations="infinite" duration={1800} /> : null}
        <Tap
          onPress={() => void shoot()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={Platform.OS === 'web' ? 'Choose a selfie photo' : 'Take selfie'}
          accessibilityState={{ busy }}
          style={s.shutter}
        >
          {busy ? <ActivityIndicator color={c.ink} /> : <View style={s.shutterDot} />}
        </Tap>
      </View>
    </View>
  );
}

// ---------- 22 · verified ----------

export function profileLine(me: Pick<MyProfile, 'pronouns' | 'age' | 'heightCm' | 'city'>): string {
  return [me.pronouns, String(me.age), me.heightCm ? formatFeetInchesPrimes(me.heightCm) : null, me.city]
    .filter(Boolean)
    .join(' · ');
}

export function VerifiedStep({ me }: { me: MyProfile }) {
  const { next } = useStepNav('verified');
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.centerScreen, s.verifiedScreen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <View style={s.flex} />
      <Animate frames={keyframes.stamp()} duration={800} delay={150} accessible accessibilityRole="image" accessibilityLabel="Verified">
        <VerifiedSeal size={96} />
      </Animate>
      <Rise delay={600}>
        <Text style={[ob.bigTitle, s.verifiedTitle]} accessibilityRole="header">
          You’re verified
        </Text>
      </Rise>
      <Rise delay={700}>
        <Text style={[ob.bodyMuted, s.verifiedBody]}>
          The tick next to your name tells people you’re real. Your selfie has been put away, never to be shown.
        </Text>
      </Rise>
      <Rise delay={900} style={s.nameCardWrap}>
        <View style={[ob.card, s.nameCard]}>
          <View style={s.nameRow}>
            <Text style={s.cardName}>{me.displayName}</Text>
            <Animate frames={keyframes.stamp()} duration={600} delay={1400}>
              <VerifiedSeal size={20} />
            </Animate>
          </View>
          <Text style={s.cardLine}>{profileLine(me)}</Text>
        </View>
      </Rise>
      <View style={s.flex} />
      <PillButton label="Continue" onPress={() => next()} delay={1100} pulseDelay={1900} />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  centerScreen: { flex: 1, backgroundColor: c.paper, alignItems: 'center', paddingHorizontal: theme.spacing.xl },
  phoneDisc: { width: 200, height: 200, borderRadius: 100, backgroundColor: c.sand, alignItems: 'center', justifyContent: 'center' },
  phoneArt: { width: 120, height: 140 },
  guide: { position: 'absolute', left: 37, top: 37, width: 46, height: 58 },
  badge: { position: 'absolute', left: 82, top: 98 },
  introTitle: { marginTop: 36 },
  introBody: { marginTop: theme.spacing.base },
  introMuted: { marginTop: 14 },
  takeSelfie: { marginTop: 10 },
  points: { gap: theme.spacing.base, marginBottom: theme.spacing.base },
  point: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  pointText: { flex: 1, fontFamily: f.body, fontSize: 15, lineHeight: 22, color: c.ink },
  cameraScreen: { flex: 1, backgroundColor: c.paper, alignItems: 'center' },
  cameraHeader: {
    alignSelf: 'stretch',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  dev: {
    height: 34,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: c.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  devText: { fontFamily: f.bodyBold, fontSize: 14, color: c.ink },
  cameraTitle: { marginTop: 14, fontFamily: f.display, fontSize: 25, color: c.ink, textAlign: 'center' },
  cameraSub: { marginTop: theme.spacing.sm, fontFamily: f.body, fontSize: 14, color: c.muted, textAlign: 'center' },
  ovalBox: { marginTop: 34, width: OVAL_W, height: OVAL_H, alignItems: 'center', justifyContent: 'center' },
  face: { width: FACE_W, height: FACE_H, alignItems: 'center', justifyContent: 'center' },
  scanLine: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    top: FACE_H * 0.22,
    height: 2,
    borderRadius: 1,
    backgroundColor: c.accent,
    shadowColor: c.accent,
    shadowOpacity: 0.5,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  cameraError: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  privateText: { fontFamily: f.body, fontSize: 13, color: c.muted },
  shutterWrap: { width: 78, height: 78 },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.paper,
  },
  shutterDot: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.ink },
  verifiedScreen: { paddingHorizontal: theme.spacing.xl },
  verifiedTitle: { marginTop: 28 },
  verifiedBody: { marginTop: 14, fontSize: 16, lineHeight: 24 },
  nameCardWrap: { alignSelf: 'stretch', marginTop: 34 },
  nameCard: { paddingVertical: theme.spacing.base, paddingHorizontal: 18, gap: theme.spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardName: { fontFamily: f.display, fontSize: 24, color: c.ink },
  cardLine: { fontFamily: f.body, fontSize: 14, color: c.muted },
});
