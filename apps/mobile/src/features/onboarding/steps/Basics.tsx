import Ionicons from '@expo/vector-icons/Ionicons';
import { Gender, Orientation, RULES, type MyProfile } from '@perspective/contracts';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GENDER_LABEL, ORIENTATION_LABEL } from '../../../lib/labels';
import { selection } from '../../../lib/haptics';
import { theme } from '../../../theme';
import { VerifiedSeal } from '../art';
import { STEP_PROGRESS } from '../flow';
import { Animate, Float, Pop, Rise, Tap, keyframes } from '../motion';
import { useStepNav } from '../nav';
import { useSaveStep } from '../save';
import {
  CM_CHOICES,
  DEFAULT_HEIGHT_CM,
  FEET_CHOICES,
  INCH_CHOICES,
  cmFromFeetInches,
  feetInchesFromCm,
  formatFeetInchesPrimes,
} from '../values';
import { WheelPicker } from '../WheelPicker';
import { ChoiceChip, FieldCard, GUTTER, NO_WEB_OUTLINE, ONLY_YOU, OptionRow, PillButton, SHOWN, StepScreen, Stagger, ob } from '../ui';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

interface StepProps {
  me: MyProfile;
}

// ---------- 07 · basics intro ----------

const SAMPLE_CHIPS = ['she/her', '25', '5′5″', 'Bengaluru'];

export function BasicsIntro() {
  const { next } = useStepNav('basics');
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.introScreen, { paddingTop: insets.top + 56, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <View style={s.introStage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={s.introCardTilt}>
          <Rise delay={100}>
            <Float duration={5000} delay={1200}>
              <View style={s.introCard}>
                <View style={s.nameRow}>
                  <Text style={s.introName}>Aanya</Text>
                  <Pop delay={1000}>
                    <VerifiedSeal size={20} />
                  </Pop>
                </View>
                <View style={s.wrap}>
                  {SAMPLE_CHIPS.map((chip, i) => (
                    <Pop key={chip} delay={350 + i * 150} duration={450} overshoot={1.08}>
                      <Text style={s.sampleChip}>{chip}</Text>
                    </Pop>
                  ))}
                </View>
                <View style={s.postsHere}>
                  <Text style={s.postsHereText}>Your posts go here</Text>
                </View>
              </View>
            </Float>
          </Rise>
        </View>
      </View>
      <Rise delay={1100} style={s.introText}>
        <Text style={[ob.title, s.introTitle]} accessibilityRole="header">
          First, a few basics so people see you in context
        </Text>
      </Rise>
      <Rise delay={1200}>
        <Text style={[ob.bodyMuted, s.introBody]}>
          People giving you a perspective see your age, height, city and gender next to your posts.
        </Text>
      </Rise>
      <View style={s.flex} />
      <PillButton label="Continue" onPress={() => next()} delay={1400} pulseDelay={2200} />
    </View>
  );
}

// ---------- 08 · name ----------

export function NameStep({ me }: StepProps) {
  const { next } = useStepNav('name');
  const { save, saving, error } = useSaveStep();
  const [name, setName] = useState(me.displayName ?? '');
  const valid = name.trim().length > 0;
  const submit = async () => {
    if (!valid) return;
    if (await save({ displayName: name.trim() })) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.name}
      title="What’s your first name?"
      subtitle="Use the name you go by. It sits at the top of your profile."
      note={SHOWN}
      error={error}
      next={{ onPress: () => void submit(), disabled: !valid, loading: saving }}
    >
      <View style={s.fieldPad}>
        <FieldCard
          label="First name"
          value={name}
          onChangeText={setName}
          maxLength={RULES.displayNameMaxLength}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => void submit()}
        />
      </View>
    </StepScreen>
  );
}

// ---------- 09 · gender ----------

export function GenderStep({ me }: StepProps) {
  const { next } = useStepNav('gender');
  const { save, saving, error } = useSaveStep();
  const [gender, setGender] = useState<Gender | null>(me.gender);
  const submit = async () => {
    if (gender && (await save({ gender }))) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.gender}
      title="Which gender best describes you?"
      subtitle="It decides whose feeds you can appear in, based on who they’ve chosen to see."
      note={SHOWN}
      error={error}
      next={{ onPress: () => void submit(), disabled: !gender, loading: saving }}
    >
      <Stagger style={s.options} start={160} step={50}>
        {Gender.options.map((g) => (
          <OptionRow key={g} kind="radio" label={GENDER_LABEL[g]} selected={gender === g} onPress={() => setGender(g)} />
        ))}
      </Stagger>
    </StepScreen>
  );
}

// ---------- 10 · pronouns ----------

const PRONOUNS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they'];
const PRONOUNS_MAX = 30;

export function PronounsStep({ me }: StepProps) {
  const { next } = useStepNav('pronouns');
  const { save, saving, error } = useSaveStep();
  const saved = me.pronouns ?? '';
  const [preset, setPreset] = useState<string | null>(PRONOUNS.includes(saved) ? saved : null);
  const [own, setOwn] = useState(PRONOUNS.includes(saved) ? '' : saved);
  const value = (preset ?? own).trim();
  const submit = async () => {
    if (await save({ pronouns: value || null })) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.pronouns}
      title="What are your pronouns?"
      subtitle="Optional. They’re shown next to your name."
      onSkip={() => next()}
      note={SHOWN}
      error={error}
      next={{ onPress: () => void submit(), loading: saving }}
    >
      <View style={s.pronouns}>
        <Stagger style={s.chipsCentered} start={160} step={50} kind="pop">
          {PRONOUNS.map((p) => (
            <ChoiceChip
              key={p}
              size="lg"
              role="radio"
              label={p}
              selected={preset === p}
              onPress={() => {
                setPreset(preset === p ? null : p);
                setOwn('');
              }}
            />
          ))}
        </Stagger>
        <Rise delay={500}>
          <View style={s.ownField}>
            <Ionicons name="pencil-outline" size={18} color={c.muted} />
            <TextInput
              value={own}
              onChangeText={(t) => {
                setOwn(t);
                if (t) setPreset(null);
              }}
              placeholder="Or write your own"
              placeholderTextColor={c.muted}
              accessibilityLabel="Your own pronouns"
              maxLength={PRONOUNS_MAX}
              autoCapitalize="none"
              style={s.ownInput}
            />
          </View>
        </Rise>
      </View>
    </StepScreen>
  );
}

// ---------- 11 · height ----------

type Unit = 'ft' | 'cm';

export function HeightStep({ me }: StepProps) {
  const { next } = useStepNav('height');
  const { save, saving, error } = useSaveStep();
  const [cm, setCm] = useState(me.heightCm ?? DEFAULT_HEIGHT_CM);
  const [unit, setUnit] = useState<Unit>('ft');
  const { feet, inches } = feetInchesFromCm(cm);
  // 7′7″ and up is past the 230 cm limit, so the inches stop at 6 once feet reach 7.
  const inchChoices = useMemo(() => (feet >= 7 ? INCH_CHOICES.filter((i) => i <= 6) : INCH_CHOICES), [feet]);

  const submit = async () => {
    if (await save({ heightCm: cm })) next();
  };

  return (
    <StepScreen
      progress={STEP_PROGRESS.height}
      title="How tall are you?"
      subtitle="People giving perspectives on how you look find this useful context."
      note={SHOWN}
      error={error}
      next={{ onPress: () => void submit(), loading: saving }}
    >
      <View style={s.wheels}>
        {unit === 'ft' ? (
          <>
            <Animate frames={keyframes.drop(60)} duration={900} delay={150} style={s.flex}>
              <WheelPicker
                label="Feet"
                unit="feet"
                items={FEET_CHOICES}
                value={feet}
                format={(v) => `${v}′`}
                onChange={(v) => setCm(cmFromFeetInches(v, Math.min(inches, v >= 7 ? 6 : 11)))}
              />
            </Animate>
            <Animate frames={keyframes.drop(60)} duration={900} delay={250} style={s.flex}>
              <WheelPicker
                label="Inches"
                unit="inches"
                items={inchChoices}
                value={Math.min(inches, inchChoices[inchChoices.length - 1])}
                format={(v) => `${v}″`}
                onChange={(v) => setCm(cmFromFeetInches(feet, v))}
              />
            </Animate>
          </>
        ) : (
          <Animate frames={keyframes.drop(60)} duration={900} delay={150} style={s.flex}>
            <WheelPicker label="Centimetres" unit="cm" items={CM_CHOICES} value={cm} format={String} onChange={setCm} />
          </Animate>
        )}
      </View>
      <Rise delay={500} duration={600} style={s.unitsWrap}>
        <View style={s.units} accessibilityRole="radiogroup" accessibilityLabel="Units">
          {(['ft', 'cm'] as const).map((u) => (
            <Tap
              key={u}
              onPress={() => {
                selection();
                setUnit(u);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: unit === u }}
              accessibilityLabel={u === 'ft' ? 'Feet and inches' : 'Centimetres'}
              style={[s.unit, unit === u && s.unitOn]}
            >
              <Text style={[s.unitText, unit === u && s.unitTextOn]}>{u.toUpperCase()}</Text>
            </Tap>
          ))}
        </View>
        <Text style={s.converted}>{unit === 'ft' ? `That’s ${cm} cm` : `That’s ${formatFeetInchesPrimes(cm)}`}</Text>
      </Rise>
    </StepScreen>
  );
}

// ---------- 12 · city ----------

export function CityStep({ me }: StepProps) {
  const { next } = useStepNav('city');
  const { save, saving, error } = useSaveStep();
  const [city, setCity] = useState(me.city ?? '');
  const valid = city.trim().length >= 2;
  const submit = async () => {
    if (valid && (await save({ city: city.trim() }))) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.city}
      title="Which city are you in?"
      subtitle="Only your city is shown. We never ask for your exact location."
      note={SHOWN}
      error={error}
      next={{ onPress: () => void submit(), disabled: !valid, loading: saving }}
    >
      <View style={s.fieldPad}>
        <FieldCard
          label="City"
          value={city}
          onChangeText={setCity}
          maxLength={80}
          autoComplete={Platform.OS === 'android' ? 'postal-address-locality' : undefined}
          textContentType="addressCity"
          autoCapitalize="words"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => void submit()}
        />
      </View>
    </StepScreen>
  );
}

// ---------- 13 · orientation ----------

export function OrientationStep({ me }: StepProps) {
  const { next } = useStepNav('orientation');
  const { save, saving, error } = useSaveStep();
  const [orientation, setOrientation] = useState<Orientation | null>(me.orientation);
  const submit = async () => {
    if (await save({ orientation })) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.orientation}
      title="What’s your orientation?"
      subtitle="Optional, and only for you. It isn’t on your profile and doesn’t change who you see. It helps us learn how people use Perspective."
      onSkip={() => next()}
      note={<ShakingLockNote />}
      error={error}
      next={{ onPress: () => void submit(), loading: saving }}
    >
      <Stagger style={s.grid} itemStyle={s.gridItem} start={160} step={50}>
        {Orientation.options.map((o) => (
          <OptionRow
            key={o}
            kind="radio"
            compact
            label={ORIENTATION_LABEL[o]}
            selected={orientation === o}
            onPress={() => setOrientation(orientation === o ? null : o)}
          />
        ))}
      </Stagger>
    </StepScreen>
  );
}

/** "Only you see this", with the lock giving a little shake so the privacy lands. */
function ShakingLockNote() {
  return (
    <View style={s.note}>
      <Animate frames={keyframes.shake()} duration={500} delay={1000} iterations={2} easing="ease-in-out">
        <Ionicons name="lock-closed-outline" size={18} color={c.accent} />
      </Animate>
      <Text style={s.noteText}>{ONLY_YOU.text}</Text>
    </View>
  );
}

// ---------- 14 · what people will see ----------

export function PreviewStep({ me }: StepProps) {
  const { next } = useStepNav('preview');
  const shown: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
    { icon: 'person-outline', text: me.pronouns ? `${me.displayName} · ${me.pronouns}` : (me.displayName ?? '') },
    { icon: 'calendar-outline', text: String(me.age) },
    ...(me.heightCm ? [{ icon: 'swap-vertical-outline' as const, text: formatFeetInchesPrimes(me.heightCm) }] : []),
    ...(me.city ? [{ icon: 'location-outline' as const, text: me.city }] : []),
    ...(me.gender ? [{ icon: 'male-female-outline' as const, text: GENDER_LABEL[me.gender] }] : []),
  ];
  const hidden = ['Your orientation', 'Your email and birthday'];
  return (
    <StepScreen
      back={false}
      title="Here’s what people will see"
      subtitle="And what stays with you."
      footer={<PillButton label="Continue" onPress={() => next()} pulseDelay={1400} />}
    >
      <View style={s.previewBody}>
        <Rise>
          <Text style={[ob.overline, s.groupTitle]}>On your profile</Text>
        </Rise>
        <View style={[ob.card, s.list]}>
          {shown.map((row, i) => (
            <Rise key={row.text + i} delay={100 + i * 60} duration={500}>
              <View style={[s.listRow, i < shown.length - 1 && s.listDivider]}>
                <Ionicons name={row.icon} size={18} color={c.ink} />
                <Text style={s.listText}>{row.text}</Text>
              </View>
            </Rise>
          ))}
        </View>
        <Rise delay={700}>
          <Text style={[ob.overline, s.groupTitle, s.groupTitleSecond]}>Only you</Text>
        </Rise>
        <View style={s.hiddenList}>
          {hidden.map((text, i) => (
            <Rise key={text} delay={700 + i * 60} duration={500}>
              <View style={[s.listRow, i === 0 && s.hiddenDivider]}>
                <Ionicons name="eye-off-outline" size={18} color={c.muted} />
                <Text style={[s.listText, { color: c.muted }]}>{text}</Text>
              </View>
            </Rise>
          ))}
        </View>
      </View>
    </StepScreen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  introScreen: { flex: 1, backgroundColor: c.paper, paddingHorizontal: theme.spacing.lg + theme.spacing.xs },
  introStage: { height: 300 },
  introCardTilt: { marginTop: 20, marginHorizontal: 6, transform: [{ rotate: '-2deg' }] },
  introCard: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: c.ink,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  introName: { fontFamily: f.display, fontSize: 28, color: c.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  sampleChip: {
    height: 34,
    lineHeight: 34,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    backgroundColor: c.sand,
    fontFamily: f.bodyMedium,
    fontSize: 14,
    color: c.ink,
  },
  postsHere: {
    height: 120,
    borderRadius: 16,
    borderWidth: theme.borderWidth.thick,
    borderStyle: 'dashed',
    borderColor: c.waveRest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postsHereText: { fontFamily: f.bodyMedium, fontSize: 13, color: c.muted },
  introText: { marginTop: 30 },
  introTitle: { lineHeight: 38 },
  introBody: { marginTop: 14 },
  fieldPad: { paddingHorizontal: GUTTER, paddingTop: theme.spacing.xl },
  options: { paddingHorizontal: GUTTER, paddingTop: 28, gap: 10 },
  pronouns: { paddingHorizontal: GUTTER, paddingTop: 28, gap: theme.spacing.base },
  chipsCentered: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  ownField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: theme.borderWidth.hairline,
    borderStyle: 'dashed',
    borderColor: c.muted,
    paddingHorizontal: theme.spacing.base,
  },
  ownInput: { flex: 1, fontFamily: f.body, fontSize: 16, color: c.ink, paddingVertical: theme.spacing.md, ...NO_WEB_OUTLINE },
  wheels: { flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 36 },
  unitsWrap: { alignItems: 'center', marginTop: 28, gap: 10 },
  units: { flexDirection: 'row', padding: 3, borderRadius: theme.radius.pill, backgroundColor: c.sandDeep },
  unit: { height: 38, minWidth: 64, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  unitOn: { backgroundColor: c.surface },
  unitText: { fontFamily: f.bodySemibold, fontSize: 14, color: c.muted },
  unitTextOn: { color: c.ink },
  converted: { fontFamily: f.body, fontSize: 13, color: c.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: GUTTER, paddingTop: 26 },
  gridItem: { width: '48%', flexGrow: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1 },
  noteText: { fontFamily: f.bodyMedium, fontSize: 14, color: c.ink },
  previewBody: { paddingHorizontal: GUTTER, paddingTop: theme.spacing.sm },
  groupTitle: { marginTop: 26, marginBottom: theme.spacing.sm, marginHorizontal: theme.spacing.xs },
  groupTitleSecond: { marginTop: 22 },
  list: { overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: 14, paddingHorizontal: theme.spacing.base },
  listDivider: { borderBottomWidth: theme.borderWidth.hairline, borderBottomColor: c.sand },
  listText: { fontFamily: f.bodyMedium, fontSize: 15, color: c.ink },
  hiddenList: { backgroundColor: c.sand, borderRadius: 18, overflow: 'hidden' },
  hiddenDivider: { borderBottomWidth: theme.borderWidth.hairline, borderBottomColor: c.line },
});
