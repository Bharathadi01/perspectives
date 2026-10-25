import { inCommonTitle, thingsInCommon } from '../src/features/explore/inCommon';

const me = { interests: ['photography', 'hiking_trails', 'podcasts'], city: 'Mumbai', lifestylePace: 'early_bird', socialPreference: 'small_groups' } as const;

describe('thingsInCommon', () => {
  it('lists shared interests first, then same city, rhythm and social energy', () => {
    const items = thingsInCommon(me as never, { ...me, interests: ['hiking_trails', 'photography', 'gaming'], city: ' mumbai ' } as never);
    expect(items.map((i) => i.kind)).toEqual(['interest', 'interest', 'city', 'lifestyle', 'social']);
    expect(items[0].label).toBe('Hiking & Trails');
    expect(items[2].label).toBe('mumbai');
  });

  it('returns nothing when nothing is shared', () => {
    expect(thingsInCommon(me as never, { interests: ['gaming'], city: 'Delhi', lifestylePace: null, socialPreference: null } as never)).toEqual([]);
  });

  it('never counts two empty answers as shared', () => {
    const blank = { interests: [], city: null, lifestylePace: null, socialPreference: null };
    expect(thingsInCommon(blank as never, blank as never)).toEqual([]);
  });
});

describe('inCommonTitle', () => {
  it('uses the singular for one thing', () => {
    expect(inCommonTitle('Tara', 1)).toBe('You + Tara have 1 thing in common');
    expect(inCommonTitle('Tara', 4)).toBe('You + Tara have 4 things in common');
  });
});
