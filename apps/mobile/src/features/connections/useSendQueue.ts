import type { Message } from '@perspective/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { api, newKey } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { errorCode } from '../../lib/errors';
import type { PendingMessage } from './thread';

/**
 * Sending in a chat: the message shows at once, then either settles into the
 * thread or stays put marked "Not sent" with a retry. A retry reuses the first
 * attempt's idempotency key, so the server can never post it twice.
 */
export function useSendQueue(connectionId: string, onClosed: () => void) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;

  const attempt = useCallback(
    async (item: PendingMessage) => {
      try {
        const sent = await api.connect.send(connectionId, item.text, item.key);
        // Put the confirmed message into the thread now rather than waiting for the next poll.
        qc.setQueryData<Message[]>(queryKeys.messages(connectionId), (old) =>
          old ? (old.some((m) => m.id === sent.id) ? old : [...old, sent]) : [sent],
        );
        setPending((list) => list.filter((p) => p.localId !== item.localId));
        void qc.invalidateQueries({ queryKey: queryKeys.connections });
      } catch (err) {
        if (errorCode(err) === 'CONNECTION_CLOSED') {
          setPending((list) => list.filter((p) => p.localId !== item.localId));
          void qc.invalidateQueries({ queryKey: queryKeys.connections });
          closedRef.current();
          return;
        }
        setPending((list) => list.map((p) => (p.localId === item.localId ? { ...p, status: 'failed' } : p)));
      }
    },
    [connectionId, qc],
  );

  const send = useCallback(
    (text: string) => {
      const item: PendingMessage = {
        localId: `local-${newKey()}`,
        text,
        key: newKey(),
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      setPending((list) => [...list, item]);
      void attempt(item);
    },
    [attempt],
  );

  const retry = useCallback(
    (localId: string) => {
      const item = pending.find((p) => p.localId === localId);
      if (!item) return;
      const again = { ...item, status: 'sending' as const };
      setPending((list) => list.map((p) => (p.localId === localId ? again : p)));
      void attempt(again);
    },
    [attempt, pending],
  );

  const discard = useCallback((localId: string) => {
    setPending((list) => list.filter((p) => p.localId !== localId));
  }, []);

  return { pending, send, retry, discard };
}
