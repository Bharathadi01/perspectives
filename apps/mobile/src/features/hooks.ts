import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePostInput,
  CreateReportInput,
  GivePerspectiveInput,
  LogInInput,
  PerspectiveFeedbackInput,
  SignUpInput,
  UpdatePostInput,
  UpdateProfileInput,
  UploadMediaInput,
} from '@perspective/contracts';
import { api } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { useIdempotentMutation } from '../lib/useIdempotentMutation';
import { unregisterPush } from '../push/push';
import { useSession } from '../session/sessionStore';

// ---------- session ----------
export function useSignUp() {
  const setStatus = useSession((s) => s.setStatus);
  const qc = useQueryClient();
  return useIdempotentMutation((input: SignUpInput) => api.auth.signUp(input), {
    onSuccess: () => {
      qc.clear();
      setStatus('signedIn');
    },
  });
}

export function useLogIn() {
  const setStatus = useSession((s) => s.setStatus);
  const qc = useQueryClient();
  return useIdempotentMutation((input: LogInInput) => api.auth.logIn(input), {
    onSuccess: () => {
      qc.clear();
      setStatus('signedIn');
    },
  });
}

export function useLogOut() {
  const setStatus = useSession((s) => s.setStatus);
  const qc = useQueryClient();
  return useIdempotentMutation(async () => {
    await unregisterPush();
    await api.auth.logOut();
  }, {
    onSettled: () => {
      qc.clear();
      setStatus('signedOut');
    },
  });
}

// ---------- profile & posts ----------
export function useMe(enabled = true) {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => api.me.get(), enabled });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useIdempotentMutation((input: UpdateProfileInput, key: string) => api.me.update(input, key), {
    onSuccess: (me) => {
      qc.setQueryData(queryKeys.me, me);
      // A changed audience changes who Explore may show, so the card on screen can be out of date.
      void qc.invalidateQueries({ queryKey: queryKeys.explore });
    },
  });
}

export function useUploadMedia() {
  return useIdempotentMutation((input: UploadMediaInput, key: string) => api.media.upload(input, key));
}

export function useVerifySelfie() {
  const qc = useQueryClient();
  return useIdempotentMutation((mediaId: string, key: string) => api.me.verifySelfie(mediaId, key), {
    onSuccess: (me) => qc.setQueryData(queryKeys.me, me),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useIdempotentMutation((input: CreatePostInput, key: string) => api.posts.create(input, key), {
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useIdempotentMutation(
    ({ postId, input }: { postId: string; input: UpdatePostInput }, key: string) =>
      api.posts.update(postId, input, key),
    {
      onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
    },
  );
}

export function useReorderPosts() {
  const qc = useQueryClient();
  return useIdempotentMutation(
    (postIds: string[], key: string) => api.posts.reorder(postIds, key),
    {
      onSuccess: (newPosts) => {
        qc.setQueryData(queryKeys.me, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            posts: newPosts,
          };
        });
        qc.invalidateQueries({ queryKey: queryKeys.me });
      },
    },
  );
}

export function useRemovePost() {
  const qc = useQueryClient();
  return useIdempotentMutation((postId: string, key: string) => api.posts.remove(postId, key), {
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useProfileView(profileId: string) {
  return useQuery({ queryKey: queryKeys.profile(profileId), queryFn: () => api.profiles.view(profileId), enabled: !!profileId });
}

// ---------- explore & perspectives ----------
export function useExplore() {
  return useQuery({ queryKey: queryKeys.explore, queryFn: () => api.explore.next() });
}

export function useSkip() {
  const qc = useQueryClient();
  return useIdempotentMutation((profileId: string, key: string) => api.explore.skip(profileId, key), {
    onSuccess: (next) => qc.setQueryData(queryKeys.explore, next),
  });
}

export function useGivePerspective() {
  const qc = useQueryClient();
  return useIdempotentMutation((input: GivePerspectiveInput, key: string) => api.perspectives.give(input, key), {
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.explore });
      void qc.invalidateQueries({ queryKey: queryKeys.inbox });
      void qc.invalidateQueries({ queryKey: queryKeys.given });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useInbox() {
  return useQuery({ queryKey: queryKeys.inbox, queryFn: () => api.perspectives.inbox() });
}

export function useGiven() {
  return useQuery({ queryKey: queryKeys.given, queryFn: () => api.perspectives.given() });
}

export function useFeedback() {
  const qc = useQueryClient();
  return useIdempotentMutation(
    ({ id, input }: { id: string; input: PerspectiveFeedbackInput }, key: string) => api.perspectives.feedback(id, input, key),
    { onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inbox }) },
  );
}

// ---------- connect & chat ----------
function useInvalidateSocial() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.inbox });
    void qc.invalidateQueries({ queryKey: queryKeys.connections });
    void qc.invalidateQueries({ queryKey: ['profile'] });
  };
}

export function useRequestConnect() {
  const refresh = useInvalidateSocial();
  return useIdempotentMutation((receiverId: string, key: string) => api.connect.request(receiverId, key), { onSuccess: refresh });
}

export function useAcceptConnect() {
  const refresh = useInvalidateSocial();
  return useIdempotentMutation((requestId: string, key: string) => api.connect.accept(requestId, key), { onSuccess: refresh });
}

export function useDeclineConnect() {
  const refresh = useInvalidateSocial();
  return useIdempotentMutation((requestId: string, key: string) => api.connect.decline(requestId, key), { onSuccess: refresh });
}

export function useConnections(enabled = true) {
  return useQuery({ queryKey: queryKeys.connections, queryFn: () => api.connect.connections(), enabled });
}

/** Chat is polled in v1 (PostgreSQL is canonical; sockets come later). */
export function useMessages(connectionId: string) {
  return useQuery({
    queryKey: queryKeys.messages(connectionId),
    queryFn: () => api.connect.messages(connectionId),
    refetchInterval: 4000,
    enabled: !!connectionId,
  });
}

export function useSendMessage(connectionId: string) {
  const qc = useQueryClient();
  return useIdempotentMutation((text: string, key: string) => api.connect.send(connectionId, text, key), {
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.messages(connectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.connections });
    },
  });
}

export function useUnmatch() {
  const refresh = useInvalidateSocial();
  return useIdempotentMutation((connectionId: string, key: string) => api.connect.unmatch(connectionId, key), { onSuccess: refresh });
}

// ---------- connected moment ----------
/**
 * New connections the user has not celebrated yet. Checked when the app opens, when it comes back to
 * the foreground (react-query refetches on focus), and every 15 seconds while it is open, until push
 * notifications exist.
 */
export function useUnseenConnections(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.unseenConnections,
    queryFn: () => api.connect.unseen(),
    enabled,
    refetchInterval: 15_000,
    staleTime: 0,
  });
}

export function useMarkConnectionsSeen() {
  const qc = useQueryClient();
  return useIdempotentMutation((ids: string[], key: string) => api.connect.markSeen(ids, key), {
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.connections });
    },
  });
}

// ---------- ban screen ----------
/** For a suspended or banned person: the reason, the end date and their appeal. */
export function useRestriction() {
  return useQuery({ queryKey: queryKeys.restriction, queryFn: () => api.account.restriction(), retry: false });
}

export function useAppeal() {
  const qc = useQueryClient();
  return useIdempotentMutation((message: string, key: string) => api.account.appeal({ message }, key), {
    onSuccess: (r) => qc.setQueryData(queryKeys.restriction, r),
  });
}

// ---------- notices ----------
/** The in-app notices list (You → Notices), refetched when the app comes back to the foreground. */
export function useNotices(enabled = true) {
  return useQuery({ queryKey: queryKeys.notices, queryFn: () => api.notices.list(), enabled });
}

export function useMarkNoticesRead() {
  const qc = useQueryClient();
  return useIdempotentMutation((_: void, key: string) => api.notices.markAllRead(key), {
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notices }),
  });
}

// ---------- safety ----------
export function useReport() {
  return useIdempotentMutation((input: CreateReportInput, key: string) => api.safety.report(input, key));
}

export function useBlock() {
  const qc = useQueryClient();
  return useIdempotentMutation((userId: string, key: string) => api.safety.block(userId, key), {
    onSuccess: () => void qc.invalidateQueries(),
  });
}

/** You → Blocked people. */
export function useBlocked() {
  return useQuery({ queryKey: queryKeys.blocked, queryFn: () => api.safety.blocked() });
}

/** Unblocking can bring the person back into Explore and profiles, so everything refreshes. */
export function useUnblock() {
  const qc = useQueryClient();
  return useIdempotentMutation((userId: string, key: string) => api.safety.unblock(userId, key), {
    onSuccess: () => void qc.invalidateQueries(),
  });
}

export function useDeleteAccount() {
  const setStatus = useSession((s) => s.setStatus);
  const qc = useQueryClient();
  return useIdempotentMutation((password: string) => api.safety.deleteAccount({ password, confirmationPhrase: 'DELETE MY ACCOUNT' }), {
    onSuccess: () => {
      qc.clear();
      setStatus('signedOut');
    },
  });
}
