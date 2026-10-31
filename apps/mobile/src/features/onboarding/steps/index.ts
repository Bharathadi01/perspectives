import type { MyProfile } from '@perspective/contracts';
import type React from 'react';
import type { StepId } from '../flow';
import { AudienceStep, GoalStep, InterestsStep, PersonalityStep, RhythmStep } from './About';
import { BasicsIntro, CityStep, GenderStep, HeightStep, NameStep, OrientationStep, PreviewStep, PronounsStep } from './Basics';
import { HowItWorksStep, NotificationsStep, ReadyStep, ReviewStep } from './Finish';
import { FocusStep, MorePostsStep, PhotoPostStep, PostsIntro, VoiceStep } from './Posts';
import { SelfieCamera, SelfieIntro, VerifiedStep } from './Selfie';
import { ValueConnect, ValuePerspectives, ValueSeen, ValueWords } from './ValueScreens';

/** Every onboarding screen, by step id. Each gets the signed-in profile, loaded and current. */
export const STEP_SCREENS: Record<StepId, React.ComponentType<{ me: MyProfile }>> = {
  'value-perspectives': ValuePerspectives,
  basics: BasicsIntro,
  name: NameStep,
  gender: GenderStep,
  pronouns: PronounsStep,
  height: HeightStep,
  city: CityStep,
  orientation: OrientationStep,
  preview: PreviewStep,
  'value-words': ValueWords,
  goal: GoalStep,
  audience: AudienceStep,
  'value-connect': ValueConnect,
  interests: InterestsStep,
  rhythm: RhythmStep,
  personality: PersonalityStep,
  selfie: SelfieIntro,
  'selfie-camera': SelfieCamera,
  verified: VerifiedStep,
  'value-seen': ValueSeen,
  posts: PostsIntro,
  'first-post': PhotoPostStep,
  focus: FocusStep,
  'more-posts': MorePostsStep,
  voice: VoiceStep,
  review: ReviewStep,
  'how-it-works': HowItWorksStep,
  notifications: NotificationsStep,
  ready: ReadyStep,
};
