export const queryKeys = {
  me: ['me'] as const,
  explore: ['explore'] as const,
  inbox: ['inbox'] as const,
  given: ['perspectives', 'given'] as const,
  profile: (id: string) => ['profile', id] as const,
  connections: ['connections'] as const,
  unseenConnections: ['connections', 'unseen'] as const,
  messages: (connectionId: string) => ['messages', connectionId] as const,
  notices: ['notices'] as const,
  restriction: ['restriction'] as const,
  blocked: ['blocks'] as const,
};
