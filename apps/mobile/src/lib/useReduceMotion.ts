import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the phone asks for reduced motion, kept in sync while the screen is
 * mounted. Starts false, so a transition that is already on screen never waits
 * on the first check; a screen whose *entrance* must not animate before the
 * answer arrives should read the tri-state itself instead.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (active) setReduce(on);
      })
      .catch(() => {
        if (active) setReduce(false);
      });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
