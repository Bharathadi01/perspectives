import type { Connection, Message } from '@perspective/contracts';
import {
  buildThread,
  connectedLabel,
  dayLabel,
  isYourTurn,
  listTime,
  previewLine,
  theirOpening,
  type PendingMessage,
} from '../src/features/connections/thread';

const ME = 'me';
const THEM = 'them';
// A fixed Wednesday afternoon, local time.
const NOW = new Date(2026, 9, 28, 15, 0);

function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 9, day, hour, minute).toISOString();
}

function msg(id: string, from: string, createdAt: string): Message {
  return { id, connectionId: 'c1', senderId: from, text: id, createdAt };
}

const partner = { id: THEM, displayName: 'Kavya', age: 25, verified: true, primaryPhotoUrl: null };

describe('dayLabel', () => {
  it('names today, yesterday and the days of this week', () => {
    expect(dayLabel(at(28, 9), NOW)).toBe('Today');
    expect(dayLabel(at(27, 23), NOW)).toBe('Yesterday');
    expect(dayLabel(at(25, 12), NOW)).toBe('Sunday');
  });

  it('falls back to the date, with the year only when it is another year', () => {
    expect(dayLabel(at(12, 12), NOW)).toBe('12 Oct');
    expect(dayLabel(new Date(2025, 11, 31, 12).toISOString(), NOW)).toBe('31 Dec 2025');
  });
});

describe('listTime and connectedLabel', () => {
  it('shortens weekdays on the list', () => {
    expect(listTime(at(26, 10), NOW)).toBe('Mon');
    expect(listTime(at(27, 10), NOW)).toBe('Yesterday');
  });

  it('reads naturally above the thread', () => {
    expect(connectedLabel(at(27, 10), NOW)).toBe('Connected yesterday');
    expect(connectedLabel(at(26, 10), NOW)).toBe('Connected on Monday');
    expect(connectedLabel(at(2, 10), NOW)).toBe('Connected 2 Oct');
  });
});

describe('buildThread', () => {
  it('puts a day divider wherever the date changes', () => {
    const items = buildThread([msg('a', THEM, at(27, 22)), msg('b', ME, at(28, 9))], [], THEM, NOW);
    expect(items.map((i) => (i.type === 'day' ? i.label : i.key))).toEqual(['Yesterday', 'a', 'Today', 'b']);
  });

  it('leaves out the first divider when the "Connected" line already names that day', () => {
    const items = buildThread([msg('a', THEM, at(27, 22)), msg('b', ME, at(28, 9))], [], THEM, NOW, at(27, 20));
    expect(items.map((i) => (i.type === 'day' ? i.label : i.key))).toEqual(['a', 'Today', 'b']);
  });

  it('groups a burst from one person into one run', () => {
    const items = buildThread(
      [msg('a', THEM, at(28, 10, 0)), msg('b', THEM, at(28, 10, 2)), msg('c', THEM, at(28, 10, 3)), msg('d', ME, at(28, 10, 4))],
      [],
      THEM,
      NOW,
    ).filter((i) => i.type === 'message');
    expect(items.map((i) => i.type === 'message' && [i.first, i.last])).toEqual([
      [true, false],
      [false, false],
      [false, true],
      [true, true],
    ]);
  });

  it('starts a new run after a pause', () => {
    const items = buildThread([msg('a', ME, at(28, 10, 0)), msg('b', ME, at(28, 10, 30))], [], THEM, NOW).filter(
      (i) => i.type === 'message',
    );
    expect(items.every((i) => i.type === 'message' && i.first && i.last)).toBe(true);
  });

  it('shows messages still sending, or not sent, after the confirmed ones and as mine', () => {
    const pending: PendingMessage[] = [{ localId: 'p1', text: 'hi', key: 'k1', createdAt: at(28, 11), status: 'failed' }];
    const items = buildThread([msg('a', THEM, at(28, 10))], pending, THEM, NOW);
    const last = items[items.length - 1];
    expect(last).toMatchObject({ type: 'message', key: 'p1', mine: true, status: 'failed', localId: 'p1' });
  });
});

describe('list row helpers', () => {
  const base = { partner } as Pick<Connection, 'partner'>;

  it('says "You:" before your own last message only', () => {
    expect(previewLine({ ...base, lastMessage: { text: 'hey', senderId: ME, createdAt: at(28, 9) } })).toBe('You: hey');
    expect(previewLine({ ...base, lastMessage: { text: 'hey', senderId: THEM, createdAt: at(28, 9) } })).toBe('hey');
  });

  it('invites a first message on a new connection', () => {
    expect(previewLine({ ...base, lastMessage: null })).toBe('You both gave perspectives. Say hi.');
  });

  it('is your turn when they wrote last or nobody has written', () => {
    expect(isYourTurn({ ...base, lastMessage: { text: 'x', senderId: THEM, createdAt: at(28, 9) } })).toBe(true);
    expect(isYourTurn({ ...base, lastMessage: null })).toBe(true);
    expect(isYourTurn({ ...base, lastMessage: { text: 'x', senderId: ME, createdAt: at(28, 9) } })).toBe(false);
  });
});

describe('theirOpening', () => {
  const photoPost = { id: 'p1', kind: 'photo' as const, mediaUrl: '/m/1', prompt: 'First impression?', category: 'looks' as const };
  const voicePost = { id: 'p2', kind: 'audio' as const, mediaUrl: '/m/2', prompt: 'How do I sound?', category: 'voice' as const };

  it('shows what they said to you when they asked to connect', () => {
    expect(
      theirOpening({
        partner,
        origin: { fromUserId: THEM, comment: 'Warm.', postPrompt: 'First impression?', postCategory: 'looks', post: photoPost },
        reply: { fromUserId: ME, comment: 'Calm.', postPrompt: 'What do you assume?' },
      }),
    ).toEqual({ comment: 'Warm.', prompt: 'First impression?', photoUrl: '/m/1', postKind: 'photo' });
  });

  it('shows what they gave back when you asked, never your own words', () => {
    const opening = theirOpening({
      partner,
      origin: { fromUserId: ME, comment: 'Calm.', postPrompt: 'What do you assume?', postCategory: 'looks' },
      reply: { fromUserId: THEM, comment: 'Warm.', postPrompt: 'How do I sound?', post: voicePost },
    });
    expect(opening).toEqual({ comment: 'Warm.', prompt: 'How do I sound?', photoUrl: null, postKind: 'audio' });
  });

  it('is empty when only your own perspective exists', () => {
    expect(
      theirOpening({
        partner,
        origin: { fromUserId: ME, comment: 'Calm.', postPrompt: 'What do you assume?', postCategory: 'looks' },
        reply: null,
      }),
    ).toBeNull();
  });
});
