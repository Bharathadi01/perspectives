import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useUnseenConnections } from '../../features/hooks';

/** Screens where the user is writing or busy; the moment waits until they leave. */
const BUSY_PREFIXES = ['/give', '/post', '/chat', '/connected', '/me/edit', '/onboarding'];

/**
 * Shows the "you're connected" moment for connections made while the user was away or on another
 * screen (for example someone accepted their request). Mounted once inside the tabs.
 */
export function ConnectedMomentWatcher({ enabled }: { enabled: boolean }) {
  const unseen = useUnseenConnections(enabled);
  const pathname = usePathname();
  const shownFor = useRef('');

  useEffect(() => {
    const list = unseen.data;
    if (!list || list.length === 0) return;
    if (BUSY_PREFIXES.some((p) => pathname.startsWith(p))) return;
    const ids = list.map((c) => c.id).sort().join(',');
    if (shownFor.current === ids) return;
    shownFor.current = ids;
    router.push({ pathname: '/connected', params: { ids } });
  }, [unseen.data, pathname]);

  return null;
}
