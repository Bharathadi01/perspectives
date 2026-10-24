import { RULES, type MyProfile, type Post, type PostKind } from '@perspective/contracts';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PostComposer } from '../post-composer/PostComposer';
import { PostEditor } from '../post-composer/PostEditor';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { useToast } from '../../components/ui/Toast';
import { useRemovePost, useReorderPosts } from '../../features/hooks';
import { errorMessage } from '../../lib/errors';
import { setBusy } from '../../lib/busyFlag';
import { thud, warn } from '../../lib/haptics';
import { theme } from '../../theme';
import { CardActionsSheet } from './CardActionsSheet';
import { PhotoGrid } from './PhotoGrid';
import { PromptList } from './PromptList';
import { VerificationRow } from './VerificationRow';
import {
  canRemovePost,
  movePost,
  photoIndices,
  photosBefore,
  REMOVE_MESSAGE,
  REORDER_MESSAGE,
  swapPhotos,
  swapPrompts,
} from './reorder';

/** One modal at a time, so six independent booleans cannot contradict each other. */
type EditorModal =
  | { kind: 'none' }
  | { kind: 'compose'; postKind: PostKind }
  | { kind: 'editPrompt'; post: Post }
  | { kind: 'confirmRemove'; post: Post };

interface ProfileEditorProps {
  me: MyProfile;
  onRefetch: () => Promise<unknown>;
  /** Called before navigating away, so the host can keep this pane selected. */
  onNavigateAway?: () => void;
}

/**
 * Managing your cards: that is the whole job of this pane. Basics, goal,
 * audience and everything else moved to Settings.
 *
 * Photos get the grid; voice and written cards are listed under it. All of them
 * share the same six places.
 */
export function ProfileEditor({ me, onRefetch, onNavigateAway }: ProfileEditorProps) {
  const toast = useToast();
  const reorderPosts = useReorderPosts();
  const removePost = useRemovePost();

  const [draft, setDraft] = useState<Post[]>(me.posts);
  const [modal, setModal] = useState<EditorModal>({ kind: 'none' });
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  // One voice note at a time across all cards.
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => setDraft(me.posts), [me.posts]);

  // An interrupting moment waits while a modal is open on top of the editor.
  const blocking = modal.kind !== 'none';
  useEffect(() => {
    setBusy('profile-editor', blocking);
    // Nothing keeps playing behind a screen that has opened over the cards.
    if (blocking) setPlayingId(null);
    return () => setBusy('profile-editor', false);
  }, [blocking]);

  const actionsIndex = useMemo(
    () => (actionsFor ? draft.findIndex((p) => p.id === actionsFor) : -1),
    [actionsFor, draft],
  );
  const actionsPost = actionsIndex >= 0 ? draft[actionsIndex] : null;
  const photos = useMemo(() => photoIndices(draft).map((i) => draft[i]), [draft]);
  const canAdd = draft.length < RULES.maxPosts;

  // What the card menu says and offers depends on which section the card is in.
  const actionsContext = (() => {
    if (!actionsPost) return null;
    if (actionsPost.kind === 'photo') {
      const place = photos.findIndex((p) => p.id === actionsPost.id);
      return {
        where: `Photo ${place + 1} of ${photos.length}`,
        canMoveEarlier: place > 0,
        canMoveLater: place < photos.length - 1,
        move: (direction: -1 | 1) => commitOrder(swapPhotos(draft, place, place + direction)),
      };
    }
    // A voice or written card steps past one card at a time, but never into the lead.
    return {
      where: `After photo ${photosBefore(draft, actionsIndex)}`,
      canMoveEarlier: actionsIndex > 1,
      canMoveLater: actionsIndex < draft.length - 1,
      move: (direction: -1 | 1) => commitOrder(movePost(draft, actionsIndex, actionsIndex + direction)),
    };
  })();

  const close = () => setModal({ kind: 'none' });

  const saved = async () => {
    close();
    await onRefetch();
  };

  const [dragging, setDragging] = useState(false);

  /** Saves a new order: shown at once, rolled back if the server refuses it. */
  const commitOrder = async (result: ReturnType<typeof movePost>) => {
    if (result === null) return;
    if ('error' in result) {
      warn();
      toast(REORDER_MESSAGE[result.error], 'info');
      return;
    }

    const previous = draft;
    setDraft(result.posts);
    setSaving(true);
    thud();
    try {
      await reorderPosts.run(result.posts.map((p) => p.id));
    } catch (err) {
      setDraft(previous);
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const swapPhoto = (from: number, to: number) => commitOrder(swapPhotos(draft, from, to));
  const swapPrompt = (from: number, to: number) => commitOrder(swapPrompts(draft, from, to));
  const onDraggingChange = (on: boolean) => {
    setDragging(on);
    if (on) setPlayingId(null);
  };

  const askRemove = (post: Post) => {
    const refusal = canRemovePost(draft, post.id);
    if (refusal) {
      warn();
      toast(REMOVE_MESSAGE[refusal], 'error');
      return;
    }
    setModal({ kind: 'confirmRemove', post });
  };

  const confirmRemove = async (post: Post) => {
    setRemoving(true);
    try {
      await removePost.run(post.id);
      close();
      await onRefetch();
      toast('Card removed.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setRemoving(false);
    }
  };

  const startAdd = (postKind: PostKind) => {
    onNavigateAway?.();
    setModal({ kind: 'compose', postKind });
  };

  const sayFull = () => {
    warn();
    toast(`Your voice and written cards use the other places. A profile holds ${RULES.maxPosts} cards in all.`, 'info');
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        // A lifted card owns the finger; the page must not scroll under it.
        scrollEnabled={!dragging}
      >
        <View style={s.sectionHeader}>
          <Text style={s.caption}>PHOTOS</Text>
          <Text style={s.count}>{saving ? 'Saving…' : `${draft.length} of ${RULES.maxPosts} cards`}</Text>
        </View>

        <PhotoGrid
          photos={photos}
          playingId={playingId}
          onPlay={setPlayingId}
          onEdit={(post) => setModal({ kind: 'editPrompt', post })}
          onActions={(post) => setActionsFor(post.id)}
          onAdd={() => startAdd('photo')}
          free={RULES.maxPosts - draft.length}
          onFull={sayFull}
          onSwap={(from, to) => void swapPhoto(from, to)}
          onDraggingChange={onDraggingChange}
        />

        <Text style={s.hint}>Tap a photo to edit it. Hold and drag to reorder. Your first photo leads.</Text>

        {/* A voice or written card cannot lead, so the list waits for the first photo. */}
        {photos.length > 0 ? (
          <>
            <Text style={[s.caption, s.secondSection]}>VOICE & WRITTEN</Text>
            <PromptList
              posts={draft}
              playingId={playingId}
              onPlay={setPlayingId}
              onEdit={(post) => setModal({ kind: 'editPrompt', post })}
              onActions={(post) => setActionsFor(post.id)}
              onAdd={startAdd}
              canAdd={canAdd}
              onSwap={(from, to) => void swapPrompt(from, to)}
              onDraggingChange={onDraggingChange}
            />
          </>
        ) : null}

        <VerificationRow me={me} />
      </ScrollView>

      <CardActionsSheet
        post={actionsPost}
        where={actionsContext?.where ?? ''}
        canMoveEarlier={actionsContext?.canMoveEarlier ?? false}
        canMoveLater={actionsContext?.canMoveLater ?? false}
        onClose={() => setActionsFor(null)}
        onMove={(direction) => {
          setActionsFor(null);
          void actionsContext?.move(direction);
        }}
        onEdit={() => {
          const post = actionsPost;
          setActionsFor(null);
          if (post) setModal({ kind: 'editPrompt', post });
        }}
        onRemove={() => {
          const post = actionsPost;
          setActionsFor(null);
          if (post) askRemove(post);
        }}
      />

      <PostComposer
        visible={modal.kind === 'compose'}
        kind={modal.kind === 'compose' ? modal.postKind : 'photo'}
        onClose={close}
        onSaved={async () => {
          await onRefetch();
        }}
      />
      <PostEditor
        visible={modal.kind === 'editPrompt'}
        post={modal.kind === 'editPrompt' ? modal.post : null}
        onClose={close}
        onSaved={async () => {
          await onRefetch();
        }}
      />

      <ConfirmSheet
        visible={modal.kind === 'confirmRemove'}
        title="Remove this card?"
        subtitle="People will no longer see it, and the perspectives on it go with it."
        confirmTitle="Remove"
        destructive
        loading={removing}
        onConfirm={() => modal.kind === 'confirmRemove' && void confirmRemove(modal.post)}
        onClose={close}
      />
    </>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.base,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  caption: { ...theme.textStyles.overline, color: theme.colors.muted },
  count: { ...theme.textStyles.callout, color: theme.colors.muted },
  hint: { ...theme.textStyles.callout, color: theme.colors.muted },
  secondSection: { marginTop: theme.spacing.md },
});
