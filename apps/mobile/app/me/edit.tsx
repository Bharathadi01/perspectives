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
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { api } from '../../src/api/client';
import { AudienceForm } from '../../src/components/forms/AudienceForm';
import { GoalForm } from '../../src/components/forms/GoalForm';
import { BasicsForm } from '../../src/components/forms/BasicsForm';
import { AudioRecordingModal } from '../../src/components/profile/AudioRecordingModal';
import { EditPostPromptModal } from '../../src/components/profile/EditPostPromptModal';
import { PhotoGridReorder } from '../../src/components/profile/PhotoGridReorder';
import { PhotoUploadModal } from '../../src/components/profile/PhotoUploadModal';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { PromptLibraryModal } from '../../src/components/profile/PromptLibraryModal';
import { useAudioPlayer } from '../../src/components/profile/useAudioPlayer';
import { WrittenPerspectiveModal } from '../../src/components/profile/WrittenPerspectiveModal';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { Sheet } from '../../src/components/ui/Sheet';
import { ErrorState, LoadingState } from '../../src/components/ui/States';
import { Label, Muted, Title } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { useMe, useRemovePost, useReorderPosts, useUpdatePost } from '../../src/features/hooks';
import { errorMessage } from '../../src/lib/errors';
import { GOAL_LABEL, audienceQuestion, formatDuration } from '../../src/lib/labels';
import { theme } from '../../src/theme';

function AttachedPerspectiveCard({
  post,
  index,
  isTopPhoto,
  onEdit,
}: {
  post: Post;
  index: number;
  isTopPhoto: boolean;
  onEdit: () => void;
}) {
  const isAudioKind = post.kind === 'audio';
  const isTextKind = post.kind === 'text';
  const isPhotoKind = post.kind === 'photo';

  const audioUrl = isAudioKind
    ? (post.mediaUrl ? api.mediaUrl(post.mediaUrl) : '')
    : (post.audioMediaUrl ? api.mediaUrl(post.audioMediaUrl) : '');
  const hasVoice = !!audioUrl;
  const player = useAudioPlayer(audioUrl);

  return (
    <View style={s.perspectiveCard}>
      <View style={s.perspectiveCardTop}>
        {isPhotoKind ? (
          <Image
            source={{ uri: post.mediaUrl ? api.mediaUrl(post.mediaUrl) : '' }}
            style={s.perspectiveThumb}
          />
        ) : isAudioKind ? (
          <View style={s.perspectiveVoiceThumb}>
            <Ionicons name="mic" size={20} color="#FFFFFF" />
          </View>
        ) : (
          <View style={s.perspectiveTextThumb}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.brand} />
          </View>
        )}

        <View style={s.perspectiveMeta}>
          <View style={s.perspectiveHeaderPillRow}>
            <Text style={s.perspectivePhotoLabel}>
              {isPhotoKind
                ? `Photo ${index + 1}${isTopPhoto ? ' • Top Photo' : ''}`
                : isAudioKind
                ? `Voice Perspective`
                : `Written Perspective`}
            </Text>
            {hasVoice ? (
              <View style={s.voiceBadgePillSmall}>
                <Ionicons name="mic" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                <Text style={s.voiceBadgeTextSmall}>VOICE PERSPECTIVE</Text>
              </View>
            ) : (
              <View style={s.writtenBadgePillSmall}>
                <Text style={s.writtenBadgeTextSmall}>
                  {CATEGORY_CATALOG[post.category]?.label.toUpperCase() || 'WRITTEN'}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.perspectiveQuestionText}>"{post.prompt}"</Text>

          {isTextKind && post.focusAreas && post.focusAreas.length > 0 && (
            <View style={s.inlineFocusRow}>
              {post.focusAreas.map((f) => (
                <Text key={f} style={s.inlineFocusTag}>#{f}</Text>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={onEdit}
          style={s.editPromptBtn}
          accessibilityRole="button"
          accessibilityLabel={`Edit perspective ${index + 1}`}
        >
          <Ionicons name="create-outline" size={15} color={theme.colors.brand} />
          <Text style={s.editPromptBtnText}>Edit</Text>
        </Pressable>
      </View>

      {/* If Voice: interactive audio playback bar */}
      {hasVoice && (
        <View style={s.inlineAudioRow}>
          <Pressable
            style={s.inlinePlayBtn}
            onPress={() => void player.toggle()}
            accessibilityRole="button"
            accessibilityLabel={player.playing ? 'Pause recording' : 'Play recording'}
          >
            <Ionicons
              name={player.playing ? 'pause' : 'play'}
              size={15}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={s.inlineWaveTrack}>
            <View
              style={[
                s.inlineWaveFill,
                { width: `${Math.round(player.progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={s.inlineDurationText}>
            {formatDuration(post.audioDurationSec ?? post.durationSec ?? 0)}
          </Text>
        </View>
      )}
    </View>
  );
}

function asPublicProfile(me: MyProfile, customPosts?: Post[]): PublicProfile | null {
  if (!me.displayName || !me.gender || !me.heightCm || !me.city) return null;
  return {
    id: me.id,
    displayName: me.displayName,
    age: me.age,
    gender: me.gender,
    heightCm: me.heightCm,
    city: me.city,
    pronouns: me.pronouns ?? null,
    interests: me.interests ?? [],
    lifestylePace: me.lifestylePace ?? null,
    socialPreference: me.socialPreference ?? null,
    personalityPrompts: me.personalityPrompts ?? [],
    verified: me.selfieStatus === 'verified',
    posts: customPosts ?? me.posts,
  };
}

export default function EditProfile() {
  const { section, from, initialMode } = useLocalSearchParams<{
    section?: 'basics' | 'goal' | 'audience' | 'all';
    from?: 'onboarding';
    initialMode?: 'preview' | 'edit';
  }>();

  const me = useMe();
  const removePost = useRemovePost();
  const reorderPosts = useReorderPosts();
  const updatePost = useUpdatePost();
  const toast = useToast();

  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  const [subSection, setSubSection] = useState<'posts' | 'basics' | 'goal' | 'audience'>(
    section === 'audience' || section === 'basics' || section === 'goal' ? section : 'posts',
  );

  // Modals state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showWrittenModal, setShowWrittenModal] = useState(false);
  const [showAddChoiceSheet, setShowAddChoiceSheet] = useState(false);
  const [photoIsPrimary, setPhotoIsPrimary] = useState(false);
  const [editPromptPost, setEditPromptPost] = useState<Post | null>(null);
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
  const hasPrimaryPhoto = photoPosts.length > 0;
  const filledCount = posts.length;
  const progressPercent = Math.round((filledCount / RULES.maxPosts) * 100);

  // Synchronized public profile representation
  const publicProfile = asPublicProfile(me.data, posts);

  const handleReorderPosts = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= posts.length) return;
    if (toIndex < 0 || toIndex >= posts.length) return;

    // Rule: Position 0 must always be a photo
    const movingPost = posts[fromIndex];
    if (toIndex === 0 && movingPost.kind !== 'photo') {
      toast('The top card (slot 1) must be a photo to introduce yourself.', 'info');
      return;
    }

    const reordered = [...posts];
    if (Math.abs(fromIndex - toIndex) === 1) {
      const temp = reordered[fromIndex];
      reordered[fromIndex] = reordered[toIndex];
      reordered[toIndex] = temp;
    } else {
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
    }

    if (reordered[0]?.kind !== 'photo') {
      toast('The top card (slot 1) must be a photo to introduce yourself.', 'info');
      return;
    }

    const updated = reordered.map((p, idx) => ({ ...p, position: idx }));
    setLocalPosts(updated);
    setSaveStatus('saving');

    try {
      await reorderPosts.run(updated.map((p) => p.id));
      setSaveStatus('saved');
      toast(toIndex === 0 ? 'Top photo updated.' : 'Cards rearranged.', 'success');
    } catch (err) {
      setSaveStatus('error');
      toast(errorMessage(err), 'error');
      if (me.data?.posts) setLocalPosts(me.data.posts);
    }
  };

  const handleAddSlot = (slotIdx: number, isPrimary: boolean) => {
    if (posts.length === 0 || isPrimary) {
      setPhotoIsPrimary(true);
      setShowPhotoModal(true);
    } else {
      setShowAddChoiceSheet(true);
    }
  };

  const confirmDeletePost = (post: Post) => {
    if (posts.length <= 1) {
      toast('You must keep at least one card on your profile.', 'error');
      return;
    }
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

  if (subSection === 'goal') {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable onPress={() => setSubSection('posts')} accessibilityRole="button" accessibilityLabel="Back to profile editor" style={s.headerBtn}>
            <Text style={s.headerBtnText}>Back</Text>
          </Pressable>
          <Text style={s.headerTitleText}>Your Goal</Text>
          <View style={s.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <GoalForm
            me={me.data}
            onSaved={() => {
              toast('Goal updated.', 'success');
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
          <Text style={s.headerTitleText}>Your Audience</Text>
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
            <View style={s.sectionTitleGroup}>
              <Text style={s.sectionTitle}>My Photos & Perspectives</Text>
              {posts.length < RULES.maxPosts && (
                <Pressable
                  style={s.addPerspectiveHeaderBtn}
                  onPress={() => {
                    if (posts.length === 0) {
                      setPhotoIsPrimary(true);
                      setShowPhotoModal(true);
                    } else {
                      setShowAddChoiceSheet(true);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add photo or perspective"
                >
                  <Ionicons name="add" size={14} color={theme.colors.brand} />
                  <Text style={s.addPerspectiveHeaderBtnText}>Add</Text>
                </Pressable>
              )}
            </View>
            {saveStatus === 'saving' ? (
              <Text style={s.savingIndicator}>Saving…</Text>
            ) : null}
          </View>

          {/* 3x2 Grid with Drag Reorder & Tap-to-Swap for Photos, Voice, and Written Perspectives */}
          <PhotoGridReorder
            posts={posts}
            onReorder={handleReorderPosts}
            onAddSlot={handleAddSlot}
            onEditPrompt={(post) => setEditPromptPost(post)}
            onRemovePhoto={confirmDeletePost}
            onDragStart={() => setScrollEnabled(false)}
            onDragEnd={() => setScrollEnabled(true)}
          />

          {/* Attached Perspectives List (Photos, Voice & Written) */}
          {posts.length > 0 && (
            <View style={s.perspectivesListSection}>
              <Text style={s.perspectivesListTitle}>
                Attached Perspectives ({posts.length})
              </Text>
              {posts.map((post, idx) => (
                <AttachedPerspectiveCard
                  key={post.id}
                  post={post}
                  index={idx}
                  isTopPhoto={idx === 0}
                  onEdit={() => setEditPromptPost(post)}
                />
              ))}
            </View>
          )}

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

          <Pressable style={s.cardRow} onPress={() => setSubSection('goal')}>
            <View style={s.cardRowLeft}>
              <Text style={s.cardRowTitle}>Your Goal (private)</Text>
              <Text style={s.cardRowSubtitle}>
                {me.data.goals.length > 0 ? me.data.goals.map((g) => GOAL_LABEL[g].title).join(' and ') : 'Choose your goal'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </Pressable>

          <Pressable style={s.cardRow} onPress={() => setSubSection('audience')}>
            <View style={s.cardRowLeft}>
              <Text style={s.cardRowTitle}>{audienceQuestion(me.data.goals)}</Text>
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
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSaved={async () => {
          setShowVoiceModal(false);
          await me.refetch();
        }}
      />

      <WrittenPerspectiveModal
        visible={showWrittenModal}
        onClose={() => setShowWrittenModal(false)}
        onSaved={async () => {
          setShowWrittenModal(false);
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

      {/* Add Choice Bottom Sheet */}
      <Sheet
        visible={showAddChoiceSheet}
        onClose={() => setShowAddChoiceSheet(false)}
        title="Add to Profile"
        subtitle="Choose how you would like to share your perspective"
      >
        <Pressable
          style={s.choiceItem}
          onPress={() => {
            setShowAddChoiceSheet(false);
            setPhotoIsPrimary(false);
            setShowPhotoModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Photo with perspective"
        >
          <View style={[s.choiceIconContainer, { backgroundColor: theme.colors.brandSoft }]}>
            <Ionicons name="camera-outline" size={22} color={theme.colors.brand} />
          </View>
          <View style={s.choiceTextContainer}>
            <Text style={s.choiceItemTitle}>Photo with Perspective</Text>
            <Text style={s.choiceItemSubtitle}>
              Upload a photo with an attached question or voice note.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Pressable>

        <Pressable
          style={s.choiceItem}
          onPress={() => {
            setShowAddChoiceSheet(false);
            setShowVoiceModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Voice perspective without photo"
        >
          <View style={[s.choiceIconContainer, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="mic-outline" size={22} color="#7C3AED" />
          </View>
          <View style={s.choiceTextContainer}>
            <Text style={s.choiceItemTitle}>Voice Perspective (No photo)</Text>
            <Text style={s.choiceItemSubtitle}>
              Record an audio answer to a question to share your voice.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Pressable>

        <Pressable
          style={s.choiceItem}
          onPress={() => {
            setShowAddChoiceSheet(false);
            setShowWrittenModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Written perspective without photo"
        >
          <View style={[s.choiceIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="create-outline" size={22} color="#D97706" />
          </View>
          <View style={s.choiceTextContainer}>
            <Text style={s.choiceItemTitle}>Written Perspective (No photo)</Text>
            <Text style={s.choiceItemSubtitle}>
              Select a question and focus hints for others to review.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Pressable>
      </Sheet>
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
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  perspectivesListSection: {
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  perspectivesListTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  perspectiveCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  perspectiveCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  perspectiveThumb: {
    width: 44,
    height: 52,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
  },
  perspectiveMeta: {
    flex: 1,
    gap: 3,
  },
  perspectiveHeaderPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  perspectivePhotoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  voiceBadgePillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radius.pill,
  },
  voiceBadgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  writtenBadgePillSmall: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  writtenBadgeTextSmall: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  perspectiveQuestionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  editPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brandSoft,
  },
  editPromptBtnText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.brand,
  },
  inlineAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.control,
    gap: theme.spacing.sm,
  },
  inlinePlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineWaveTrack: {
    flex: 1,
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  inlineWaveFill: {
    height: '100%',
    backgroundColor: theme.colors.brand,
  },
  inlineDurationText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontWeight: '600',
    minWidth: 30,
  },
  perspectiveVoiceThumb: {
    width: 44,
    height: 52,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perspectiveTextThumb: {
    width: 44,
    height: 52,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inlineFocusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  inlineFocusTag: {
    fontSize: 10,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addPerspectiveHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  choiceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTextContainer: {
    flex: 1,
    gap: 2,
  },
  choiceItemTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  choiceItemSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    lineHeight: 16,
  },
});
