import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CANONICAL_INTERESTS,
  CANONICAL_PERSONALITY_PROMPTS,
  Gender,
  Goal,
  INTEREST_CATEGORY_CONFIG,
  InterestCategory,
  LifestylePace,
  RULES,
  SocialPreference,
  type MyProfile,
} from '@perspective/contracts';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { warn } from '../../../lib/haptics';
import { PERSPECTIVES_ONLY_HINT, audienceQuestion, perspectivesOnly } from '../../../lib/labels';
import { theme } from '../../../theme';
import { AgeRange } from '../AgeRange';
import { MAX_INTERESTS, MIN_INTERESTS, STEP_PROGRESS } from '../flow';
import { Rise, Tap, useTypewriter } from '../motion';
import { useStepNav } from '../nav';
import { useSaveStep } from '../save';
import { ChoiceChip, GUTTER, NO_WEB_OUTLINE, ONLY_YOU, OptionRow, PrivacyNote, StepScreen, Stagger, ob } from '../ui';

const e = theme.editorial;
const c = e.colors;
const f = e.fonts;

interface StepProps {
  me: MyProfile;
}

// ---------- 15 · goal ----------

/** The goal question's own wording (design 2026-10-31); the goal stays private either way. */
const GOAL_COPY: Record<Goal, { title: string; description: string }> = {
  get_perspectives: { title: 'Get perspectives', description: 'Honest takes on how you look, dress, sound and show up.' },
  meet_people: { title: 'Meet new people', description: 'After you give someone a perspective, you can ask to connect.' },
};

export function GoalStep({ me }: StepProps) {
  const { next } = useStepNav('goal');
  const { save, saving, error } = useSaveStep();
  const [goals, setGoals] = useState<Goal[]>(me.goals);
  const toggle = (g: Goal) => {
    const picked = goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g];
    // Canonical order, so "both" always reads the same.
    setGoals(Goal.options.filter((o) => picked.includes(o)));
  };
  const submit = async () => {
    if (goals.length > 0 && (await save({ goals }))) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.goal}
      title="What brings you here?"
      subtitle="Pick one or both. It’s never shown on your profile or to the people you connect with."
      note={ONLY_YOU}
      error={error}
      next={{ onPress: () => void submit(), disabled: goals.length === 0, loading: saving }}
    >
      <Stagger style={s.options} start={160} step={60}>
        {Goal.options.map((g) => (
          <OptionRow
            key={g}
            kind="check"
            big
            label={GOAL_COPY[g].title}
            description={GOAL_COPY[g].description}
            selected={goals.includes(g)}
            onPress={() => toggle(g)}
          />
        ))}
      </Stagger>
    </StepScreen>
  );
}

// ---------- 16 · audience ----------

const AUDIENCE_LABEL: Record<Gender, string> = { woman: 'Women', man: 'Men', non_binary: 'Non-binary people' };
/** The range the existing onboarding started from; the person moves it from here. */
const DEFAULT_AGES = { minAge: RULES.minAge, maxAge: 35 };

export function AudienceStep({ me }: StepProps) {
  const { next } = useStepNav('audience');
  const { save, saving, error } = useSaveStep();
  // Someone here only for perspectives starts with everyone; including more people brings more.
  const [genders, setGenders] = useState<Gender[]>(
    me.audience?.genders ?? (perspectivesOnly(me.goals) ? [...Gender.options] : []),
  );
  const [ages, setAges] = useState(me.audience ? { minAge: me.audience.minAge, maxAge: me.audience.maxAge } : DEFAULT_AGES);
  const toggle = (g: Gender) => {
    const picked = genders.includes(g) ? genders.filter((x) => x !== g) : [...genders, g];
    setGenders(Gender.options.filter((o) => picked.includes(o)));
  };
  const submit = async () => {
    if (genders.length > 0 && (await save({ audience: { genders, ...ages } }))) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.audience}
      title={audienceQuestion(me.goals)}
      subtitle="One setting, used both ways: you only see people who would also see you."
      note={ONLY_YOU}
      error={error}
      next={{ onPress: () => void submit(), disabled: genders.length === 0, loading: saving }}
    >
      <Stagger style={[s.options, s.optionsTight]} start={160} step={50}>
        {Gender.options.map((g) => (
          <OptionRow key={g} kind="check" label={AUDIENCE_LABEL[g]} selected={genders.includes(g)} onPress={() => toggle(g)} />
        ))}
      </Stagger>
      {perspectivesOnly(me.goals) ? (
        <Rise delay={300}>
          <Text style={s.hint}>{PERSPECTIVES_ONLY_HINT}</Text>
        </Rise>
      ) : null}
      <Rise delay={350} style={s.agesPad}>
        <AgeRange minAge={ages.minAge} maxAge={ages.maxAge} onChange={setAges} />
      </Rise>
    </StepScreen>
  );
}

// ---------- 17 · interests ----------

export function InterestsStep({ me }: StepProps) {
  const { next } = useStepNav('interests');
  const { save, saving, error, setError } = useSaveStep();
  const [picked, setPicked] = useState<string[]>(me.interests);
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return InterestCategory.options
      .map((cat) => ({
        cat,
        label: INTEREST_CATEGORY_CONFIG[cat].label,
        items: CANONICAL_INTERESTS.filter((i) => i.category === cat && (!q || i.label.toLowerCase().includes(q))),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [query]);

  const toggle = (id: string) => {
    setError(null);
    if (picked.includes(id)) {
      setPicked(picked.filter((x) => x !== id));
      return;
    }
    if (picked.length >= MAX_INTERESTS) {
      warn();
      setError(`You can pick up to ${MAX_INTERESTS}. Unpick one to swap it.`);
      return;
    }
    setPicked([...picked, id]);
  };

  const submit = async () => {
    if (picked.length >= MIN_INTERESTS && (await save({ interests: picked }))) next();
  };

  return (
    <StepScreen
      progress={STEP_PROGRESS.interests}
      title="What are you into?"
      subtitle={`Pick ${MIN_INTERESTS} to ${MAX_INTERESTS}. Shared interests help us choose who you see.`}
      note={<PrivacyNote icon="eye" text={`${picked.length} of ${MAX_INTERESTS} · shown on your profile`} />}
      error={error}
      next={{ onPress: () => void submit(), disabled: picked.length < MIN_INTERESTS, loading: saving }}
    >
      <Rise delay={160} style={s.searchPad}>
        <View style={s.search}>
          <Ionicons name="search-outline" size={18} color={c.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search interests"
            placeholderTextColor={c.muted}
            accessibilityLabel="Search interests"
            autoCorrect={false}
            style={s.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Tap onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={s.clear}>
              <Ionicons name="close-circle" size={18} color={c.muted} />
            </Tap>
          ) : null}
        </View>
      </Rise>
      <View style={s.sections}>
        {sections.length === 0 ? <Text style={s.empty}>Nothing matches “{query}”.</Text> : null}
        {sections.map((sec, i) => (
          <Rise key={sec.cat} delay={220 + Math.min(i, 5) * 70} duration={600} style={s.section}>
            <Text style={ob.overline} accessibilityRole="header">
              {sec.label}
            </Text>
            <View style={s.chips}>
              {sec.items.map((item) => (
                <ChoiceChip
                  key={item.id}
                  role="checkbox"
                  label={item.label}
                  selected={picked.includes(item.id)}
                  onPress={() => toggle(item.id)}
                />
              ))}
            </View>
          </Rise>
        ))}
      </View>
    </StepScreen>
  );
}

// ---------- 18 · daily rhythm and social energy ----------

/** Short chip wording for the picker; the profile shows the full labels from the contract. */
const PACE_CHIP: Record<LifestylePace, string> = {
  early_bird: 'Early riser',
  night_owl: 'Night owl',
  balanced: 'Flexible & balanced',
  active_adventurer: 'Always on the move',
  laid_back: 'Easygoing & cozy',
};
const ENERGY_CHIP: Record<SocialPreference, string> = {
  introvert: 'Introverted',
  extrovert: 'Extroverted',
  ambivert: 'Ambivert',
  small_groups: 'Intimate circles',
  social_butterfly: 'Social butterfly',
};

export function RhythmStep({ me }: StepProps) {
  const { next } = useStepNav('rhythm');
  const { save, saving, error } = useSaveStep();
  const [pace, setPace] = useState<LifestylePace | null>(me.lifestylePace ?? null);
  const [energy, setEnergy] = useState<SocialPreference | null>(me.socialPreference ?? null);
  const submit = async () => {
    if (await save({ lifestylePace: pace, socialPreference: energy })) next();
  };
  return (
    <StepScreen
      progress={STEP_PROGRESS.rhythm}
      title="How do your days usually go?"
      subtitle="Both optional. A little texture for your profile."
      onSkip={() => next()}
      note={{ text: 'Shown on your profile', icon: 'eye' }}
      error={error}
      next={{ onPress: () => void submit(), loading: saving, delay: 600 }}
    >
      <View style={s.rhythm}>
        <Rise delay={160}>
          <ChipCard title="Daily rhythm" start={250}>
            {LifestylePace.options.map((p) => (
              <ChoiceChip key={p} size="md" role="radio" label={PACE_CHIP[p]} selected={pace === p} onPress={() => setPace(pace === p ? null : p)} />
            ))}
          </ChipCard>
        </Rise>
        <Rise delay={300}>
          <ChipCard title="Social energy" start={400}>
            {SocialPreference.options.map((p) => (
              <ChoiceChip
                key={p}
                size="md"
                role="radio"
                label={ENERGY_CHIP[p]}
                selected={energy === p}
                onPress={() => setEnergy(energy === p ? null : p)}
              />
            ))}
          </ChipCard>
        </Rise>
      </View>
    </StepScreen>
  );
}

function ChipCard({ title, start, children }: { title: string; start: number; children: React.ReactNode }) {
  return (
    <View style={s.chipCard} accessibilityRole="radiogroup" accessibilityLabel={title}>
      <Text style={s.chipCardTitle} accessibilityRole="header">
        {title}
      </Text>
      <Stagger style={s.chips} start={start} step={40} kind="pop">
        {children}
      </Stagger>
    </View>
  );
}

// ---------- 19 · personality ----------

const ANSWER_MAX = 300;
/** The prompts keep "..." in the contract; on screen it reads as a real ellipsis. */
const pretty = (question: string) => question.replace(/\.\.\.$/, '…');

export function PersonalityStep({ me }: StepProps) {
  const { next } = useStepNav('personality');
  const { save, saving, error } = useSaveStep();
  const saved = me.personalityPrompts[0];
  const [promptId, setPromptId] = useState(saved?.promptId ?? 'feel_most_myself');
  const [answer, setAnswer] = useState(saved?.answer ?? '');
  const prompt = CANONICAL_PERSONALITY_PROMPTS.find((p) => p.id === promptId) ?? CANONICAL_PERSONALITY_PROMPTS[0];
  const others = CANONICAL_PERSONALITY_PROMPTS.filter((p) => p.id !== prompt.id);
  const typedHint = useTypewriter(prompt.placeholder, { delay: 400, duration: 1400 });

  const cycle = () => {
    const i = CANONICAL_PERSONALITY_PROMPTS.findIndex((p) => p.id === prompt.id);
    setPromptId(CANONICAL_PERSONALITY_PROMPTS[(i + 1) % CANONICAL_PERSONALITY_PROMPTS.length].id);
  };

  const submit = async () => {
    const text = answer.trim();
    if (text.length >= 2) {
      if (await save({ personalityPrompts: [{ promptId: prompt.id, question: prompt.question, answer: text }] })) next();
      return;
    }
    // An emptied answer removes the one saved before.
    if (saved) {
      if (await save({ personalityPrompts: [] })) next();
      return;
    }
    next();
  };

  return (
    <StepScreen
      progress={STEP_PROGRESS.personality}
      title="Say something in your own words"
      subtitle="Optional. One line of yours gives people something to talk about."
      onSkip={() => next()}
      note={{ text: 'Shown on your profile', icon: 'eye' }}
      error={error}
      next={{ onPress: () => void submit(), loading: saving, delay: 900 }}
    >
      <View style={s.personality}>
        <Rise delay={150} duration={600}>
          <View style={s.answerCard}>
            <View style={s.answerHead}>
              <Text style={s.answerQuestion}>{pretty(prompt.question)}</Text>
              <Tap onPress={cycle} accessibilityRole="button" accessibilityLabel="Change question" style={s.pencil}>
                <Ionicons name="pencil-outline" size={18} color={c.ink} />
              </Tap>
            </View>
            <TextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder={typedHint}
              placeholderTextColor={c.muted}
              accessibilityLabel="Your answer"
              accessibilityHint={pretty(prompt.question)}
              multiline
              maxLength={ANSWER_MAX}
              style={s.answerInput}
            />
            <Text style={s.answerCount}>
              {answer.length} / {ANSWER_MAX}
            </Text>
          </View>
        </Rise>
        <Rise delay={500}>
          <Text style={[ob.overline, s.pickAnother]} accessibilityRole="header">
            Or pick another
          </Text>
        </Rise>
        <Stagger style={s.otherList} start={560} step={60}>
          {others.slice(0, 3).map((p) => (
            <Tap
              key={p.id}
              onPress={() => setPromptId(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`Answer: ${pretty(p.question)}`}
              style={s.other}
            >
              <Text style={s.otherText}>{pretty(p.question)}</Text>
            </Tap>
          ))}
        </Stagger>
      </View>
    </StepScreen>
  );
}

const s = StyleSheet.create({
  options: { paddingHorizontal: GUTTER, paddingTop: 28, gap: theme.spacing.md },
  optionsTight: { paddingTop: 22, gap: theme.spacing.sm },
  hint: { paddingHorizontal: GUTTER + theme.spacing.xs, paddingTop: 10, fontFamily: f.body, fontSize: 13, lineHeight: 19, color: c.muted },
  agesPad: { paddingHorizontal: GUTTER, paddingTop: 18 },
  searchPad: { paddingHorizontal: GUTTER, paddingTop: 18 },
  search: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: theme.radius.pill,
    paddingLeft: theme.spacing.base,
    paddingRight: theme.spacing.xs,
  },
  searchInput: { flex: 1, fontFamily: f.body, fontSize: 15, color: c.ink, paddingVertical: 0, ...NO_WEB_OUTLINE },
  clear: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sections: { paddingHorizontal: GUTTER, paddingTop: 18, gap: theme.spacing.base },
  section: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  empty: { fontFamily: f.body, fontSize: 15, color: c.muted, textAlign: 'center', paddingVertical: theme.spacing.lg },
  rhythm: { paddingHorizontal: 20, paddingTop: 22, gap: theme.spacing.md },
  chipCard: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    borderRadius: 20,
    padding: 18,
    gap: theme.spacing.md,
  },
  chipCardTitle: { fontFamily: f.bodySemibold, fontSize: 15, color: c.ink },
  personality: { paddingHorizontal: 20, paddingTop: 22, gap: 14 },
  answerCard: {
    backgroundColor: c.surface,
    borderWidth: theme.borderWidth.thick,
    borderColor: c.ink,
    borderRadius: 22,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 10,
  },
  answerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  answerQuestion: { flex: 1, fontFamily: f.bodySemibold, fontSize: 14, color: c.ink },
  pencil: { width: 44, height: 44, marginVertical: -10, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  answerInput: {
    minHeight: 87,
    fontFamily: f.display,
    fontSize: 22,
    lineHeight: 29,
    color: c.ink,
    padding: 0,
    textAlignVertical: 'top',
    ...NO_WEB_OUTLINE,
  },
  answerCount: { alignSelf: 'flex-end', fontFamily: f.body, fontSize: 12, color: c.muted },
  pickAnother: { marginTop: 6, marginHorizontal: theme.spacing.xs },
  otherList: { gap: theme.spacing.sm },
  other: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: 14,
    borderWidth: theme.borderWidth.hairline,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
  otherText: { fontFamily: f.bodyMedium, fontSize: 15, color: c.ink },
});
