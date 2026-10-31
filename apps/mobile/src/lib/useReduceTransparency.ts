import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Whether iOS asks for less see-through surfaces; glass then becomes a solid fill. */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((on) => active && setReduce(on))
      .catch((err: unknown) => console.warn('Could not read Reduce Transparency', err));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
