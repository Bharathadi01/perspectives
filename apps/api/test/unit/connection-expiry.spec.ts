import { evaluateExpiry, expiryForViewer, ExpiryConfig, ExpiryFacts } from '../../src/domain/connection-expiry';

const config: ExpiryConfig = {
  firstReplyWarnHours: 24,
  firstReplyCloseHours: 48,
  firstReplyBackstopDays: 7,
  noMessageRemindDays: 2,
  noMessageCloseDays: 3,
  inactivityCloseDays: 14,
};

const H = 60 * 60 * 1000;
const D = 24 * H;
const t0 = new Date('2026-10-01T10:00:00Z');
const at = (ms: number) => new Date(t0.getTime() + ms);
const partnerOf = (id: string) => (id === 'ravi' ? 'meera' : 'ravi');

function facts(over: Partial<ExpiryFacts>): ExpiryFacts {
  return { now: t0, connectedAt: t0, firstMessage: null, partnerReplied: false, lastMessageAt: null, firstReplySeenAt: null, ...over };
}

describe('quiet connections: nobody writes', () => {
  it('stays quiet for two days, reminds on day 2, and closes on day 3', () => {
    expect(evaluateExpiry(facts({ now: at(1 * D) }), partnerOf, config)).toMatchObject({ close: null, warn: false });
    const remind = evaluateExpiry(facts({ now: at(2 * D) }), partnerOf, config);
    expect(remind).toMatchObject({ close: null, warn: true, phase: 'no_message' });
    expect(expiryForViewer(remind, 'ravi')).toEqual({ state: 'remind', closesAt: at(3 * D).toISOString() });
    expect(evaluateExpiry(facts({ now: at(3 * D) }), partnerOf, config).close).toBe('no_message');
  });
});

describe('quiet connections: the first reply', () => {
  const first = { senderId: 'ravi', at: at(1 * H) };

  it('does not start the clock until the quiet person opens the chat, with a 7-day back-stop', () => {
    const d6 = evaluateExpiry(facts({ firstMessage: first, now: at(6 * D) }), partnerOf, config);
    expect(d6).toMatchObject({ close: null, warn: false, quietUserId: 'meera' });
    const d7 = evaluateExpiry(facts({ firstMessage: first, now: at(1 * H + 7 * D) }), partnerOf, config);
    expect(d7.close).toBe('no_reply');
  });

  it('warns 24 hours after it was seen and closes at 48 hours', () => {
    const seen = at(5 * H);
    const before = evaluateExpiry(facts({ firstMessage: first, firstReplySeenAt: seen, now: at(5 * H + 23 * H) }), partnerOf, config);
    expect(before).toMatchObject({ close: null, warn: false });
    expect(expiryForViewer(before, 'meera')).toEqual({ state: 'ok', closesAt: null });

    const warned = evaluateExpiry(facts({ firstMessage: first, firstReplySeenAt: seen, now: at(5 * H + 24 * H) }), partnerOf, config);
    expect(warned).toMatchObject({ close: null, warn: true });
    expect(expiryForViewer(warned, 'meera')).toEqual({ state: 'you_owe_reply', closesAt: at(5 * H + 48 * H).toISOString() });
    // The person who wrote first never learns whether it was seen.
    expect(expiryForViewer(warned, 'ravi')).toEqual({ state: 'waiting', closesAt: null });

    const closed = evaluateExpiry(facts({ firstMessage: first, firstReplySeenAt: seen, now: at(5 * H + 48 * H) }), partnerOf, config);
    expect(closed.close).toBe('no_reply');
  });

  it('works the same when the other person writes first', () => {
    const d = evaluateExpiry(
      facts({ firstMessage: { senderId: 'meera', at: at(0) }, firstReplySeenAt: at(0), now: at(25 * H) }),
      partnerOf,
      config,
    );
    expect(d).toMatchObject({ quietUserId: 'ravi', warn: true });
  });

  it('stops once the other person replies', () => {
    const d = evaluateExpiry(
      facts({ firstMessage: first, partnerReplied: true, lastMessageAt: at(30 * H), firstReplySeenAt: at(5 * H), now: at(3 * D) }),
      partnerOf,
      config,
    );
    expect(d).toMatchObject({ phase: 'established', close: null });
  });
});

describe('quiet connections: an established chat', () => {
  it('closes only after 14 days without any message', () => {
    const base = { firstMessage: { senderId: 'ravi', at: at(0) }, partnerReplied: true, lastMessageAt: at(2 * D) };
    expect(evaluateExpiry(facts({ ...base, now: at(15 * D) }), partnerOf, config).close).toBeNull();
    expect(evaluateExpiry(facts({ ...base, now: at(16 * D) }), partnerOf, config).close).toBe('inactive');
  });
});
