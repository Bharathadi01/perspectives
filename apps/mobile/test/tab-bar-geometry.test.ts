import { LENS_INSET, lensLeft, lensLeftForFinger, slotWidth, tabIndexAt } from '../src/components/ui/tabBarGeometry';

const BAR = 350;
const TABS = 5;

describe('tab bar geometry', () => {
  it('splits the bar into equal slots', () => {
    expect(slotWidth(BAR, TABS)).toBe(70);
    expect(slotWidth(BAR, 0)).toBe(0);
  });

  it('finds the tab under a finger, clamped to the ends', () => {
    expect(tabIndexAt(10, BAR, TABS)).toBe(0);
    expect(tabIndexAt(175, BAR, TABS)).toBe(2);
    expect(tabIndexAt(-30, BAR, TABS)).toBe(0);
    expect(tabIndexAt(999, BAR, TABS)).toBe(4);
  });

  it('rests the lens inside its slot', () => {
    expect(lensLeft(0, BAR, TABS)).toBe(LENS_INSET);
    expect(lensLeft(3, BAR, TABS)).toBe(210 + LENS_INSET);
  });

  it('centres the lens on the finger but keeps it inside the bar', () => {
    const lens = 70 - LENS_INSET * 2;
    expect(lensLeftForFinger(175, BAR, TABS)).toBe(175 - lens / 2);
    expect(lensLeftForFinger(0, BAR, TABS)).toBe(LENS_INSET);
    expect(lensLeftForFinger(BAR, BAR, TABS)).toBe(BAR - lens - LENS_INSET);
  });
});
