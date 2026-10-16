import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CATEGORY_CATALOG,
  MyProfile,
  Post,
  PublicProfile,
  RULES,
} from '@perspective/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { AudienceForm } from '../../src/components/forms/AudienceForm';
import { BasicsForm } from '../../src/components/forms/BasicsForm';
import { AudioRecordingModal } from '../../src/components/profile/AudioRecordingModal';
import { EditPostPromptModal } from '../../src/components/profile/EditPostPromptModal';
import { PhotoGridReorder } from '../../src/components/profile/PhotoGridReorder';
import { PhotoUploadModal } from '../../src/components/profile/PhotoUploadModal';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { PromptLibraryModal } from '../../src/components/profile/PromptLibraryModal';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Sheet } from '../../src/components/ui/Sheet';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useMe, useRemovePost, useReorderPosts, useUpdatePost } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { formatDuration } from '../../src/lib/labels';
import { theme } from '../../src/theme';

function asPublicProfile(me: MyProfile, customPosts?: Post[]): PublicProfile | null {
  if (!me.displayName || !me.gender || !me.heightCm || !me.orientation || !me.city) return null;
  return {
    id: me.id,
    displayName: me.displayName,
    age: me.age,
    gender: me.gender,
    heightCm: me.heightCm,
    orientation: me.orientation,
    city: me.city,
    verified: me.selfieStatus === 'verified',
    posts: customPosts ?? me.posts,
  };
}

export default function EditProfile() {
  const { section, from, initialMode } = useLocalSearchParams<{
    section?: 'basics' | 'audience' | 'all';
    from?: 'onboarding';
    initialMode?: 'preview' | 'edit';
  }>();

  const me = useMe();
  const removePost = useRemovePost();
  const reorderPosts = useReorderPosts();
  const updatePost = useUpdatePost();
  const toast = useToast();

  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  const [subSection, setSubSection] = useState<'posts' | 'basics' | 'audience'>(
    section === 'audience' ? 'audience' : section === 'basics' ? 'basics' : 'posts',
  );

  // Modals state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoIsPrimary, setPhotoIsPrimary] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [editPromptPost, setEditPromptPost] = useState<Post | null>(null);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [topPhotoEnabled, setTopPhotoEnabled] = useState(true);

  // Local reorder draft state
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    if (me.data?.posts) {
      setLocalPosts(me.data.posts);
    }
  }, [me.data?.posts]);

  useEffect(() => {
    if (initialMode === 'preview') {
      setMode('view');
    }
  }, [initialMode]);

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const posts = localPosts;
  const photoPosts = posts.filter((p) => p.kind === 'photo');
  const audioPosts = posts.filter((p) => p.kind === 'audio');
  const hasPrimaryPhoto = photoPosts.length > 0;
  const filledCount = posts.length;
  const progressPercent = Math.round((filledCount / RULES.maxPosts) * 100);

  // Synchronized public profile representation
  const publicProfile = asPublicProfile(me.data, posts);

  const handleReorderPhotos = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= photoPosts.length) return;
    if (toIndex < 0 || toIndex >= photoPosts.length) return;

    const reorderedPhotos = [...photoPosts];
    if (Math.abs(fromIndex - toIndex) === 1) {
      const temp = reorderedPhotos[fromIndex];
      reorderedPhotos[fromIndex] = reorderedPhotos[toIndex];
      reorderedPhotos[toIndex] = temp;
    } else {
      const [moved] = reorderedPhotos.splice(fromIndex, 1);
      reorderedPhotos.splice(toIndex, 0, moved);
    }

    // Combine photos with audio (audio follows photos or keeps its order)
    const combined = [...reorderedPhotos, ...audioPosts];
    const updated = combined.map((p, idx) => ({ ...p, position: idx }));

    setLocalPosts(updated);
    setSaveStatus('saving');

    try {
      await reorderPosts.run(updated.map((p) => p.id));
      setSaveStatus('saved');
      toast(toIndex === 0 ? 'Top photo updated.' : 'Photos rearranged.', 'success');
    } catch (err) {
      setSaveStatus('error');
      toast(errorMessage(err), 'error');
      if (me.data?.posts) setLocalPosts(me.data.posts);
    }
  };

  const handleReorderAudio = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= audioPosts.length) return;
    if (toIdx < 0 || toIdx >= audioPosts.length) return;

    const reorderedAudio = [...audioPosts];
    const temp = reorderedAudio[fromIdx];
    reorderedAudio[fromIdx] = reorderedAudio[toIdx];
    reorderedAudio[toIdx] = temp;

    // Photos ALWAYS stay on top (positions 0..photoPosts.length - 1)
    // Perspectives only come next to / after the photos
    const combined = [...photoPosts, ...reorderedAudio];
    const updated = combined.map((p, idx) => ({ ...p, position: idx }));

    setLocalPosts(updated);
    setSaveStatus('saving');

    try {
      await reorderPosts.run(updated.map((p) => p.id));
      setSaveStatus('saved');
      toast('Voice perspectives rearranged.', 'success');
    } catch (err) {
      setSaveStatus('error');
      toast(errorMessage(err), 'error');
      if (me.data?.posts) setLocalPosts(me.data.posts);
    }
  };

  const handleSwapWrittenPerspectives = async (fromIdx: number, toIdx: number) => {
    const writtenPosts = photoPosts.filter((p) => !!p.prompt);
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= writtenPosts.length) return;
    if (toIdx < 0 || toIdx >= writtenPosts.length) return;

    const postA = writtenPosts[fromIdx];
    const postB = writtenPosts[toIdx];

    const promptA = postA.prompt;
    const catA = postA.category;
    const focusA = postA.focusAreas;

    const promptB = postB.prompt;
    const catB = postB.category;
    const focusB = postB.focusAreas;

    // Optimistically update prompt questions between the photos
    const updated = localPosts.map((p) => {
      if (p.id === postA.id) return { ...p, prompt: promptB, category: catB, focusAreas: focusB };
      if (p.id === postB.id) return { ...p, prompt: promptA, category: catA, focusAreas: focusA };
      return p;
    });

    setLocalPosts(updated);
    setSaveStatus('saving');

    try {
      await Promise.all([
        updatePost.run({ postId: postA.id, input: { prompt: promptB, category: catB, focusAreas: focusB } }),
        updatePost.run({ postId: postB.id, input: { prompt: promptA, category: catA, focusAreas: focusA } }),
      ]);
      setSaveStatus('saved');
      toast('Written perspectives rearranged.', 'success');
    } catch (err) {
      setSaveStatus('error');
      toast(errorMessage(err), 'error');
      if (me.data?.posts) setLocalPosts(me.data.posts);
    }
  };

  const confirmDeletePost = (post: Post) => {
    if (post.kind === 'photo' && photoPosts.length <= 1) {
      toast('You must keep at least one photo on your profile.', 'error');
      return;
    }
    Alert.alert(
      'Remove card?',
      'Are you sure you want to remove this item from your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePost.run(post.id);
              toast('Item removed.', 'success');
              await me.refetch();
            } catch (err) {
              toast(errorMessage(err), 'error');
            }
          },
        },
      ],
    );
  };

  const handleFinishOnboarding = () => {
    if (!hasPrimaryPhoto) {
      toast('Please add at least one photo with a question.', 'error');
      return;
    }
    void me.refetch().then(() => {
      router.replace('/(tabs)/explore');
    });
  };

  // Render Subsections for Basics or Audience
  if (subSection === 'basics') {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable onPress={() => setSubSection('posts')} accessibilityRole="button" accessibilityLabel="Back to profile editor" style={s.headerBtn}>
            <Text style={s.headerBtnText}>Back</Text>
          </Pressable>
          <Text style={s.headerTitleText}>The Basics</Text>
          <View style={s.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <BasicsForm
            me={me.data}
            onSaved={() => {
              toast('Basics updated.', 'success');
              setSubSection('posts');
            }}
          />
        </ScrollView>
      </Screen>
    );
  }

  if (subSection === 'audience') {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable onPress={() => setSubSection('posts')} accessibilityRole="button" accessibilityLabel="Back to profile editor" style={s.headerBtn}>
            <Text style={s.headerBtnText}>Back</Text>
          </Pressable>
          <Text style={s.headerTitleText}>Who Sees You</Text>
          <View style={s.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <AudienceForm
            me={me.data}
            onSaved={() => {
              toast('Audience preferences updated.', 'success');
              setSubSection('posts');
            }}
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Top Header matching reference (Cancel, Name, Done) */}
      <View style={s.header}>
        <Pressable
          onPress={() => {
            if (from === 'onboarding') {
              handleFinishOnboarding();
            } else {
              router.back();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
          style={s.headerBtn}
        >
          <Text style={s.headerBtnText}>Cancel</Text>
        </Pressable>

        <Text style={s.headerTitleText}>{me.data.displayName || 'Profile'}</Text>

        <Pressable
          onPress={() => {
            if (from === 'onboarding') {
              handleFinishOnboarding();
            } else {
              router.back();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Save and exit"
          style={s.headerBtnRight}
        >
          <Text style={s.headerBtnDoneText}>Done</Text>
        </Pressable>
      </View>

      {/* Tabs: Edit vs View with Underline Indicator */}
      <View style={s.tabBarContainer}>
        <Pressable
          style={[s.tabItem, mode === 'edit' && s.tabItemActive]}
          onPress={() => setMode('edit')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'edit' }}
        >
          <Text style={[s.tabItemText, mode === 'edit' && s.tabItemTextActive]}>Edit</Text>
        </Pressable>

        <Pressable
          style={[s.tabItem, mode === 'view' && s.tabItemActive]}
          onPress={() => setMode('view')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'view' }}
        >
          <Text style={[s.tabItemText, mode === 'view' && s.tabItemTextActive]}>View</Text>
        </Pressable>
      </View>

      {/* Mode Content */}
      {mode === 'edit' ? (
        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section: My Photos & Videos / Perspectives */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>My Photos & Perspectives</Text>
            {saveStatus === 'saving' ? (
              <Text style={s.savingIndicator}>Saving…</Text>
            ) : null}
          </View>

          {/* 3x2 Photo Grid with Drag Reorder & Tap-to-Swap */}
          <PhotoGridReorder
            photos={photoPosts}
            onReorder={handleReorderPhotos}
            onAddPhoto={(isPrimary) => {
              setPhotoIsPrimary(isPrimary);
              setShowPhotoModal(true);
            }}
            onEditPrompt={(post) => setEditPromptPost(post)}
            onRemovePhoto={confirmDeletePost}
            onDragStart={() => setScrollEnabled(false)}
            onDragEnd={() => setScrollEnabled(true)}
          />

          {/* Section: Top Photo Toggle */}
          <View style={s.cardRow}>
            <View style={s.cardRowLeft}>
              <Text style={s.cardRowTitle}>Top Photo</Text>
              <Text style={s.cardRowSubtitle}>
                Your first photo is shown first on your public profile card.
              </Text>
            </View>
            <Switch
              value={topPhotoEnabled}
              onValueChange={setTopPhotoEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.ink }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Section: Get Verified */}
          <Pressable
            style={s.cardRow}
            onPress={() => {
              if (me.data.selfieStatus !== 'verified') {
                router.push({ pathname: '/onboarding', params: { forceStep: 'selfie' } });
              }
            }}
          >
            <View style={s.cardRowLeft}>
              <View style={s.verifiedTitleRow}>
                <Ionicons
                  name={me.data.selfieStatus === 'verified' ? 'shield-checkmark' : 'shield-outline'}
                  size={18}
                  color={me.data.selfieStatus === 'verified' ? theme.colors.success : theme.colors.ink}
                  style={{ marginRight: 6 }}
                />
                <Text style={s.cardRowTitle}>Get verified</Text>
              </View>
              <Text style={s.cardRowSubtitle}>Show others your pics are really you.</Text>
            </View>

            {me.data.selfieStatus === 'verified' ? (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={s.verifiedBadgeText}>Verified</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            )}
          </Pressable>

          {/* Section: Voice Perspectives */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>
              Voice Perspectives {audioPosts.length > 0 ? `(${audioPosts.length})` : ''}
            </Text>
            {posts.length < RULES.maxPosts ? (
              <Pressable
                onPress={() => setShowAudioModal(true)}
                hitSlop={8}
                style={s.addPerspectiveHeaderBtn}
                accessibilityRole="button"
                accessibilityLabel="Add Voice Perspective"
              >
                <Ionicons name="add" size={16} color={theme.colors.brand} />
                <Text style={s.addPerspectiveHeaderText}>Add Voice</Text>
              </Pressable>
            ) : null}
          </View>

          {audioPosts.length > 0 ? (
            audioPosts.map((post, audioIdx) => (
              <View key={post.id} style={s.voicePromptCard}>
                <View style={s.voicePromptTop}>
                  <View style={s.voicePromptIcon}>
                    <Ionicons name="mic" size={20} color={theme.colors.brand} />
                  </View>
                  <View style={s.voicePromptMeta}>
                    <Text style={s.voicePromptQuestion}>"{post.prompt}"</Text>
                    <Text style={s.voicePromptDuration}>
                      Voice Note • {formatDuration(post.durationSec ?? 0)}
                    </Text>
                  </View>
                  <View style={s.perspectiveReorderRow}>
                    {audioIdx > 0 ? (
                      <Pressable
                        style={s.perspectiveArrowBtn}
                        onPress={() => handleReorderAudio(audioIdx, audioIdx - 1)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Move voice perspective up"
                      >
                        <Ionicons name="arrow-up" size={14} color={theme.colors.ink} />
                      </Pressable>
                    ) : null}

                    {audioIdx < audioPosts.length - 1 ? (
                      <Pressable
                        style={s.perspectiveArrowBtn}
                        onPress={() => handleReorderAudio(audioIdx, audioIdx + 1)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Move voice perspective down"
                      >
                        <Ionicons name="arrow-down" size={14} color={theme.colors.ink} />
                      </Pressable>
                    ) : null}

                    <Pressable
                      style={s.voiceRemoveBtn}
                      onPress={() => confirmDeletePost(post)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Remove voice perspective"
                    >
                      <Ionicons name="close" size={16} color={theme.colors.muted} />
                    </Pressable>
                  </View>
                </View>

                <View style={s.voicePromptActions}>
                  <Pressable
                    style={s.voiceActionLink}
                    onPress={() => setEditPromptPost(post)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit voice perspective question"
                  >
                    <Ionicons name="create-outline" size={15} color={theme.colors.brand} />
                    <Text style={s.voiceActionLinkText}>Edit Perspective</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Pressable
              style={s.addVoicePromptBtn}
              onPress={() => setShowAudioModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Add Voice Perspective"
            >
              <Ionicons name="mic-outline" size={20} color={theme.colors.brand} />
              <Text style={s.addVoicePromptText}>+ Add Voice Perspective (Up to 15s)</Text>
            </Pressable>
          )}

          {/* Section: Written Perspectives */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>
              Written Perspectives ({photoPosts.filter((p) => !!p.prompt).length})
            </Text>
          </View>

          {photoPosts
            .filter((p) => !!p.prompt)
            .map((post, writtenIdx, arr) => (
              <View key={`written-${post.id}`} style={s.writtenPromptCard}>
                <View style={s.promptCardHeader}>
                  <Text style={s.promptCategoryLabel}>
                    {CATEGORY_CATALOG[post.category as keyof typeof CATEGORY_CATALOG]?.label.toUpperCase() || 'PERSPECTIVE'}
                  </Text>
                  <View style={s.perspectiveReorderRow}>
                    {writtenIdx > 0 ? (
                      <Pressable
                        style={s.perspectiveArrowBtn}
                        onPress={() => handleSwapWrittenPerspectives(writtenIdx, writtenIdx - 1)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Move written perspective up"
                      >
                        <Ionicons name="arrow-up" size={14} color={theme.colors.ink} />
                      </Pressable>
                    ) : null}

                    {writtenIdx < arr.length - 1 ? (
                      <Pressable
                        style={s.perspectiveArrowBtn}
                        onPress={() => handleSwapWrittenPerspectives(writtenIdx, writtenIdx + 1)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Move written perspective down"
                      >
                        <Ionicons name="arrow-down" size={14} color={theme.colors.ink} />
                      </Pressable>
                    ) : null}

                    <Pressable
                      style={s.promptRemoveBtn}
                      onPress={() => setEditPromptPost(post)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Edit written perspective"
                    >
                      <Ionicons name="create-outline" size={16} color={theme.colors.muted} />
                    </Pressable>
                  </View>
                </View>

                <Text style={s.promptQuestionText}>"{post.prompt}"</Text>

                <View style={s.promptCardFooter}>
                  <View style={s.greatAnswerBadge}>
                    <Ionicons name="checkmark" size={12} color={theme.colors.brand} />
                    <Text style={s.greatAnswerText}>
                      Attached to Photo {photoPosts.findIndex((p) => p.id === post.id) + 1}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setEditPromptPost(post)}
                    accessibilityRole="button"
                    accessibilityLabel="Change written perspective"
                  >
                    <Text style={s.editPromptLink}>Change</Text>
                  </Pressable>
                </View>
              </View>
            ))}

          {/* Section: Profile Details (Basics & Discovery) */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Profile Details</Text>
          </View>

          <Pressable style={s.cardRow} onPress={() => setSubSection('basics')}>
            <View style={s.cardRowLeft}>
              <Text style={s.cardRowTitle}>Basic Information</Text>
              <Text style={s.cardRowSubtitle}>
                {me.data.age} yrs • {me.data.gender} • {me.data.city} • {me.data.heightCm} cm
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </Pressable>

          <Pressable style={s.cardRow} onPress={() => setSubSection('audience')}>
            <View style={s.cardRowLeft}>
              <Text style={s.cardRowTitle}>Who Sees You</Text>
              <Text style={s.cardRowSubtitle}>
                {me.data.audience
                  ? `Ages ${me.data.audience.minAge}–${me.data.audience.maxAge} • ${me.data.audience.genders.join(', ')}`
                  : 'Configure discovery audience'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </Pressable>

          <View style={{ height: theme.spacing.xxl }} />
        </ScrollView>
      ) : (
        /* View / Preview Mode */
        <ScrollView contentContainerStyle={s.previewContent} keyboardShouldPersistTaps="handled">
          <View style={s.previewBanner}>
            <Ionicons name="eye-outline" size={16} color={theme.colors.muted} />
            <Text style={s.previewBannerText}>This is how your profile appears to others in discovery.</Text>
          </View>

          {publicProfile ? (
            <ProfileView profile={publicProfile} />
          ) : (
            <View style={s.incompletePreview}>
              <Text style={s.incompleteTitle}>Incomplete Profile</Text>
              <Text style={s.incompleteText}>
                Complete your basic details and add at least one photo with a question to view your live card.
              </Text>
              <Button title="Edit Profile" onPress={() => setMode('edit')} />
            </View>
          )}

          <View style={{ height: theme.spacing.xxl }} />
        </ScrollView>
      )}

      {/* Modals for Photo Upload, Audio Recording, and Edit Prompt */}
      <PhotoUploadModal
        visible={showPhotoModal}
        isPrimary={photoIsPrimary}
        onClose={() => setShowPhotoModal(false)}
        onSaved={async () => {
          setShowPhotoModal(false);
          await me.refetch();
        }}
      />

      <AudioRecordingModal
        visible={showAudioModal}
        onClose={() => setShowAudioModal(false)}
        onSaved={async () => {
          setShowAudioModal(false);
          await me.refetch();
        }}
      />

      <EditPostPromptModal
        visible={!!editPromptPost}
        post={editPromptPost}
        onClose={() => setEditPromptPost(null)}
        onSaved={async () => {
          setEditPromptPost(null);
          await me.refetch();
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  headerBtn: {
    minWidth: 60,
    justifyContent: 'center',
  },
  headerBtnRight: {
    minWidth: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    fontWeight: '400',
  },
  headerBtnDoneText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.ink,
    fontWeight: '700',
  },
  headerTitleText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  tabBarContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderColor: theme.colors.ink,
  },
  tabItemText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    color: theme.colors.muted,
  },
  tabItemTextActive: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  content: {
    padding: theme.spacing.base,
    gap: theme.spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  savingIndicator: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardRowLeft: {
    flex: 1,
    marginRight: theme.spacing.base,
  },
  verifiedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  cardRowSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.success,
  },
  voicePromptCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    padding: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  voicePromptTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voicePromptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voicePromptMeta: {
    flex: 1,
  },
  voicePromptQuestion: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  voicePromptDuration: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 2,
  },
  voiceRemoveBtn: {
    padding: 4,
  },
  voicePromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  voiceActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceActionLinkText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.brand,
    fontWeight: '600',
  },
  addVoicePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.brand,
    gap: 8,
  },
  addVoicePromptText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.brand,
  },
  writtenPromptCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    padding: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promptCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  promptCategoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  promptRemoveBtn: {
    padding: 4,
  },
  perspectiveReorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perspectiveArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPerspectiveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.pill,
  },
  addPerspectiveHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.brand,
  },
  promptQuestionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.ink,
    marginVertical: 4,
  },
  promptCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  greatAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    gap: 4,
  },
  greatAnswerText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.brand,
  },
  editPromptLink: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  previewContent: {
    padding: theme.spacing.base,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  previewBannerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  incompletePreview: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  incompleteTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  incompleteText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
