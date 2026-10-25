import type { Audience } from '@perspective/contracts';
import { audienceUpdate, feedSummary, gendersSummary } from '../src/features/filters/audienceUpdate';

const current: Audience = { genders: ['woman', 'man'], minAge: 22, maxAge: 28 };

describe('audienceUpdate', () => {
  it('returns null when nothing changed, so today’s set is not rebuilt', () => {
    expect(audienceUpdate(current, { ...current })).toBeNull();
  });

  it('treats the same genders in a different order as unchanged', () => {
    expect(audienceUpdate(current, { ...current, genders: ['man', 'woman'] })).toBeNull();
  });

  it('sends the whole audience when only the age changed', () => {
    expect(audienceUpdate(current, { ...current, maxAge: 30 })).toEqual({ genders: ['woman', 'man'], minAge: 22, maxAge: 30 });
  });

  it('sends the whole audience when only the genders changed', () => {
    expect(audienceUpdate(current, { ...current, genders: ['woman'] })).toEqual({ genders: ['woman'], minAge: 22, maxAge: 28 });
  });

  it('never returns an empty gender list', () => {
    expect(audienceUpdate(current, { ...current, genders: [] })).toBeNull();
  });

  it('sends the first audience when there was none', () => {
    expect(audienceUpdate(null, current)).toEqual(current);
  });
});

describe('feed summary', () => {
  it('says Everyone when every gender is picked', () => {
    expect(gendersSummary(['non_binary', 'woman', 'man'])).toBe('Everyone');
  });

  it('lists picked genders in the usual order', () => {
    expect(gendersSummary(['man', 'woman'])).toBe('Women, Men');
  });

  it('shows the age range and goals', () => {
    expect(feedSummary({ audience: current, goals: ['get_perspectives', 'meet_people'] })).toEqual({
      showMe: 'Women, Men',
      age: '22–28',
      goal: 'Get perspectives · Meet new people',
    });
  });
});
