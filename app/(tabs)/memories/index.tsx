import { useCallback } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from 'hooks/useAuth';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from 'utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import NoteDetail from 'components/NoteDetail';
import AudioPlayer from 'components/AudioPlayer';
import VideoPlayerWithNotes from 'components/VideoPlayerWithNotes';
import { useTheme } from '../../../providers/ThemeProvider';
import { useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PADDING = 16;
const THUMB_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

const formatDuration = (seconds) => {
  const s = Number(seconds || 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

/* ──────────────────────────────────────────────
   Empty state — mock thumbnail card
   ────────────────────────────────────────────── */
const EmptyThumbnail = ({ type, isDark }: { type: 'video' | 'photo' | 'note'; isDark: boolean }) => {
  const icon = type === 'video' ? 'videocam' : type === 'photo' ? 'image' : 'create';
  const label =
    type === 'video'
      ? 'Your first story will appear here'
      : type === 'photo'
        ? 'Your first photo story will appear here'
        : 'Your first note will appear here';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
      <Link href={{ pathname: "/(tabs)/memories/capture", params: { defaultTab: 'video' } }} asChild>
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            width: THUMB_WIDTH,
            aspectRatio: 0.8,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#2C3E50', '#1B2838']}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name={icon} size={28} color="rgba(255,255,255,0.7)" />
            </View>
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {label}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

/* ──────────────────────────────────────────────
   Signed image helper
   ────────────────────────────────────────────── */
const SignedImage = ({ path, bucket }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (!error && mounted) setUrl(data?.signedUrl || null);
    })();
    return () => {
      mounted = false;
    };
  }, [path, bucket]);
  return url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null;
};

const SignedAudio = ({ path, bucket }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (!error && mounted) setUrl(data?.signedUrl || null);
    })();
    return () => {
      mounted = false;
    };
  }, [path, bucket]);
  return url ? <AudioPlayer uri={url} /> : null;
};

/* ──────────────────────────────────────────────
   Video Thumbnail Grid
   ────────────────────────────────────────────── */
const VideoGrid = ({
  videoItems,
  thumbnailUrls,
  handlePlayVideo,
  setShowDeleteModal,
  setCurrentVideo,
  isDark,
}: {
  videoItems: any[];
  thumbnailUrls: Record<string, string>;
  handlePlayVideo: (v: any) => void;
  setShowDeleteModal: (b: boolean) => void;
  setCurrentVideo: (v: any) => void;
  isDark: boolean;
}) => {
  if (!videoItems.length) return <EmptyThumbnail type="video" isDark={isDark} />;

  return (
    <FlatList
      data={videoItems}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_PADDING, paddingBottom: 80, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: v }) => (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePlayVideo(v)}
          onLongPress={() => {
            setCurrentVideo({ id: v.id, path: v.file_path, thumbnailPath: v.thumbnail_path });
            setShowDeleteModal(true);
          }}
          style={{
            width: THUMB_WIDTH,
            aspectRatio: 0.8,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: isDark ? '#1f2937' : '#e8e5e0',
          }}
        >
          {thumbnailUrls[v.id] ? (
            <Image source={{ uri: thumbnailUrls[v.id] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#111827' : '#1e293b' }}>
              <Ionicons name="videocam" size={32} color="rgba(255,255,255,0.4)" />
            </View>
          )}

          {/* Bottom gradient overlay with title + duration */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 10,
              paddingBottom: 10,
              paddingTop: 30,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 4 }} numberOfLines={2}>
              {v.title || 'Untitled Story'}
            </Text>
          </LinearGradient>

          {/* Duration badge */}
          {v.duration ? (
            <View
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{formatDuration(v.duration)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      )}
    />
  );
};

/* ──────────────────────────────────────────────
   Photo (Narration) Thumbnail Grid
   ────────────────────────────────────────────── */
const PhotoGrid = ({
  audioItems,
  setShowDeleteModal,
  setCurrentNarration,
  isDark,
}: {
  audioItems: any[];
  setShowDeleteModal: (b: boolean) => void;
  setCurrentNarration: (v: any) => void;
  isDark: boolean;
}) => {
  if (!audioItems.length) return <EmptyThumbnail type="photo" isDark={isDark} />;

  return (
    <FlatList
      data={audioItems}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_PADDING, paddingBottom: 80, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: n }) => (
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => {
            setCurrentNarration({ id: n.id, path: n.audio_path, thumbnailPath: n.image_path });
            setShowDeleteModal(true);
          }}
          style={{
            width: THUMB_WIDTH,
            aspectRatio: 0.8,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: isDark ? '#1f2937' : '#e8e5e0',
          }}
        >
          {n.image_path ? (
            <SignedImage path={n.image_path} bucket="images" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#111827' : '#d1cdc6' }}>
              <Ionicons name="image" size={32} color="rgba(0,0,0,0.3)" />
            </View>
          )}

          {/* Bottom gradient overlay with title + duration */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 10,
              paddingBottom: 10,
              paddingTop: 30,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 4 }} numberOfLines={2}>
              {n.title || 'Untitled Story'}
            </Text>
          </LinearGradient>

          {/* Duration badge */}
          {n.duration_seconds ? (
            <View
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{formatDuration(n.duration_seconds)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      )}
    />
  );
};

/* ──────────────────────────────────────────────
   Notes Grid — 2-col text preview cards
   ────────────────────────────────────────────── */
const NotesGrid = ({
  noteItems,
  onNoteSelected,
  setShowDeleteModal,
  setCurrentNarration,
  isDark,
}: {
  noteItems: any[];
  onNoteSelected: (note: any) => void;
  setShowDeleteModal: (b: boolean) => void;
  setCurrentNarration: (v: any) => void;
  isDark: boolean;
}) => {
  if (!noteItems.length) return <EmptyThumbnail type="note" isDark={isDark} />;

  return (
    <FlatList
      data={noteItems}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_PADDING, paddingBottom: 80, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: n }) => (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNoteSelected(n)}
          onLongPress={() => {
            setCurrentNarration({ id: n.id, path: n.audio_path, thumbnailPath: n.image_path });
            setShowDeleteModal(true);
          }}
          style={{
            width: THUMB_WIDTH,
            aspectRatio: 0.8,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#e8e5e0',
            padding: 14,
          }}
        >
          {/* Gold left border accent */}
          <View style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, backgroundColor: '#D4A853', borderRadius: 2 }} />

          <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f3f4f6' : '#1B2838', marginBottom: 8, paddingLeft: 6 }} numberOfLines={2}>
            {n.title || 'Untitled Note'}
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6B7280', lineHeight: 18, flex: 1, paddingLeft: 6 }} numberOfLines={5}>
            {(n.notes || '').slice(0, 120)}
          </Text>
          <Text style={{ fontSize: 11, color: isDark ? '#6b7280' : '#9ca3af', marginTop: 8, paddingLeft: 6 }}>
            {new Date(n.created_at).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
};

/* ──────────────────────────────────────────────
   Unlock helpers
   ────────────────────────────────────────────── */
const UnlockBadge = ({ item, getUnlockStatus }) => {
  const s = getUnlockStatus(item);

  return (
    <LinearGradient
      colors={['#D4B996', '#C2A16C', '#D4B996']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, flexDirection: "row" }}
      className="px-3 py-1 rounded-lg overflow-hidden shadow flex-row items-center"
    >
      <Ionicons style={{ paddingVertical: 4 }} name="lock-open" size={12} color="white" />
      <Text style={{ paddingVertical: 4 }} className="ml-1 text-white font-bold text-xs">{s.label}</Text>
    </LinearGradient>
  );
};

/* ──────────────────────────────────────────────
   Main Screen
   ────────────────────────────────────────────── */
const MemoriesScreen = () => {
  const { user, signOut } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams()
  const { defaultTab } = params
  const [tab, setTab] = useState(defaultTab || 'video');
  const [currentVideo, setCurrentVideo] = useState({});
  const [childFilter, setChildFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [children, setChildren] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [videos, setVideos] = useState([]);
  const [narrations, setNarrations] = useState([]);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentNarration, setCurrentNarration] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);

      const [kidsRes, narrRes, vidsRes] = await Promise.all([
        supabase.from('children').select('id,name,birthdate').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase
          .from('narrations')
          .select('id,title,image_path,notes,audio_path,duration_seconds,created_at,unlock_type,unlock_age,unlock_date,unlock_milestone,selected_children')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('videos')
          .select(
            `
          *,
          video_children (
            children (
              id,
              name,
              birthdate
            )
          )
        `,
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      setChildren(kidsRes?.data || []);
      setNarrations(narrRes?.data || []);
      const vids = vidsRes?.data || [];
      setVideos(vids);

      if (vids.length) {
        const promises = vids.map(async (v) => {
          if (!v.thumbnail_path) return { id: v.id, url: null };
          const { data, error } = await supabase.storage.from('videos').createSignedUrl(v.thumbnail_path, 3600);
          return { id: v.id, url: error ? null : data?.signedUrl || null };
        });
        const results = await Promise.all(promises);
        const map = {};
        results.forEach((r) => (map[r.id] = r.url));
        setThumbnailUrls(map);
      }
      setLoading(false);
    })();
  }, [user?.id]))

  useEffect(() => {
    setTab(defaultTab || 'video')
  }, [defaultTab])

  const filterAndSort = (items: any[]) => {
    let arr = [...items];

    if (childFilter !== 'all') {
      arr = arr.filter((it) => Array.isArray(it.selected_children) && it.selected_children.includes(childFilter));
    }

    if (statusFilter !== 'all') {
      arr = arr.filter((it) => {
        const status = getUnlockStatus(it);
        return statusFilter === 'unlocked' ? status.isUnlocked : !status.isUnlocked;
      });
    }

    arr.sort((a, b) => {
      if (sortBy === 'newest') return Number(new Date(b.created_at)) - Number(new Date(a.created_at));
      if (sortBy === 'oldest') return Number(new Date(a.created_at)) - Number(new Date(b.created_at));
      return 0;
    });

    return arr;
  };

  const audio = narrations.filter((n) => !(!n.image_path && !n.audio_path));
  const notes = narrations.filter((n) => !n.image_path && !n.audio_path);

  const audioItems = useMemo(() => filterAndSort(audio), [audio, childFilter, statusFilter, sortBy]);
  const videoItems = useMemo(() => filterAndSort(videos), [videos, childFilter, statusFilter, sortBy]);
  const noteItems = useMemo(() => filterAndSort(notes), [notes, childFilter, statusFilter, sortBy]);

  const calculateAge = (birthdate: string) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const anyChildUnlockedByAge = (selectedChildren: string[], unlockAge: number) => {
    if (!Array.isArray(selectedChildren) || !selectedChildren.length) return false;
    return selectedChildren.some((childId) => {
      const kid = children.find((c) => c.id === childId);
      return kid ? calculateAge(kid.birthdate) >= Number(unlockAge || 0) : false;
    });
  };

  const getUnlockStatus = (item) => {
    const { unlock_type, unlock_age, unlock_date } = item || {};
    if (unlock_type === 'now' || !unlock_type) return { isUnlocked: true, label: 'Unlocked' };
    if (unlock_type === 'date') {
      const d = unlock_date ? new Date(unlock_date) : null;
      const unlocked = d ? new Date() >= d : true;
      return { isUnlocked: unlocked, label: d ? d.toLocaleDateString() : 'Date' };
    }
    if (unlock_type === 'age') {
      const unlocked = anyChildUnlockedByAge(item.selected_children || [], unlock_age);
      return { isUnlocked: unlocked, label: `Age ${unlock_age ?? '—'}` };
    }
    if (unlock_type === 'milestone') return { isUnlocked: false, label: 'Milestone' };
    return { isUnlocked: true, label: 'Unlocked' };
  };

  const handleDeleteVideos = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('videos').delete().eq('id', currentVideo?.id);
      if (error) throw error;

      const { error: videoPathError } = await supabase.storage.from('videos').remove([currentVideo?.path]);
      if (videoPathError) console.error('Storage delete error:', videoPathError);

      const { error: thumbnailPathError } = await supabase.storage.from('videos').remove([currentVideo?.thumbnailPath]);
      if (thumbnailPathError) console.error('Storage delete error:', thumbnailPathError);

      setVideos((prev) => prev.filter((item) => item.id !== currentVideo?.id));
      setCurrentVideo({});
    } catch (error) {
      console.log(error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteNarrations = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('narrations').delete().eq('id', currentNarration?.id);
      if (error) throw error;

      const { error: audioPathError } = await supabase.storage.from('audio').remove([currentNarration?.path]);
      if (audioPathError) console.error('Storage delete error:', audioPathError);

      const { error: thumbnailPathError } = await supabase.storage.from('images').remove([currentNarration?.thumbnailPath]);
      if (thumbnailPathError) console.error('Storage delete error:', thumbnailPathError);

      setNarrations((prev) => prev.filter((item) => item.id !== currentNarration?.id));
      setCurrentNarration({});
    } catch (error) {
      console.log(error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleNoteSelected = (note) => {
    setSelectedNote(note);
  };

  const [allVideoSignedUrls, setAllVideoSignedUrls] = useState<Record<string, string>>({});

  const handlePlayVideo = async (video) => {
    if (!video) return;
    try {
      const { data, error } = await supabase.storage.from('videos').createSignedUrl(video.file_path, 3600);
      if (error) throw error;
      const tappedUrl = data?.signedUrl || null;

      const urlMap: Record<string, string> = {};
      if (tappedUrl) urlMap[video.id] = tappedUrl;

      const others = videoItems.filter((v) => v.id !== video.id && v.file_path);
      const promises = others.map(async (v) => {
        try {
          const { data: d, error: e } = await supabase.storage.from('videos').createSignedUrl(v.file_path, 3600);
          if (!e && d?.signedUrl) urlMap[v.id] = d.signedUrl;
        } catch {}
      });
      await Promise.all(promises);

      setAllVideoSignedUrls(urlMap);
      setSelectedVideo(video);
      setVideoUrl(tappedUrl);
    } catch (err) {
      console.error('Error playing video:', err);
    }
  };

  const screenBackground = isDark ? 'bg-gray-900' : 'bg-[#F5F3EF]';

  return (
    <SafeAreaView className={`flex-1 ${screenBackground}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1f2937' : '#F5F3EF'} />

      {/* Header — left-aligned */}
      <Text style={{ fontSize: 28, fontWeight: '700', color: isDark ? '#f3f4f6' : '#1B2838', textAlign: 'left', marginTop: 16, marginBottom: 12, paddingHorizontal: GRID_PADDING }}>
        Your Stories
      </Text>

      {/* Tab filters — directly below header */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: GRID_PADDING, marginBottom: 4 }}>
        {[
          { key: 'video', label: 'Videos', icon: 'videocam-outline' as const },
          { key: 'audio', label: 'Photos', icon: 'image-outline' as const },
          { key: 'note', label: 'Notes', icon: 'create-outline' as const },
        ].map((t) => {
          const isActive = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: isActive
                  ? (isDark ? '#D4A853' : '#1B2838')
                  : 'transparent',
                borderWidth: isActive ? 0 : 1.5,
                borderColor: isDark ? '#374151' : '#d1cdc6',
              }}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={isActive ? (isDark ? '#1B2838' : '#D4A853') : (isDark ? '#9ca3af' : '#6B7280')}
                style={{ marginRight: 6 }}
              />
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: isActive ? '#ffffff' : (isDark ? '#d1d5db' : '#1B2838'),
              }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content area */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={isDark ? '#D4A853' : '#1B2838'} />
          </View>
        ) : tab === 'video' ? (
          <VideoGrid
            videoItems={videoItems}
            thumbnailUrls={thumbnailUrls}
            handlePlayVideo={handlePlayVideo}
            setShowDeleteModal={setShowDeleteModal}
            setCurrentVideo={setCurrentVideo}
            isDark={isDark}
          />
        ) : tab === 'audio' ? (
          <PhotoGrid
            audioItems={audioItems}
            setShowDeleteModal={setShowDeleteModal}
            setCurrentNarration={setCurrentNarration}
            isDark={isDark}
          />
        ) : tab === 'note' ? (
          <NotesGrid
            noteItems={noteItems}
            onNoteSelected={handleNoteSelected}
            setShowDeleteModal={setShowDeleteModal}
            setCurrentNarration={setCurrentNarration}
            isDark={isDark}
          />
        ) : null}
      </View>

      {/* Floating Action Button — bottom-right → video mode */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '(tabs)/memories/capture', params: { defaultTab: 'video' } })}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          right: 20,
          bottom: insets.bottom + 70,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#1B2838',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Delete Modal */}
      {showDeleteModal ? (
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowDeleteModal(false);
            setCurrentNarration(null);
          }}
        >
          <View className="flex-1 bg-gray-600/50 items-center justify-center p-4">
            <View className={`${isDark ? 'bg-[#1f2937]' : 'bg-white'} rounded-xl shadow-xl max-w-md w-full p-6`}>
              <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-red-200' : 'text-red-900'}`}>Delete Story</Text>
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                This action cannot be undone. This will permanently delete the story from the vault
              </Text>

              <View className="flex-row gap-4">
                {!isDeleting ? (
                  <TouchableOpacity
                    disabled={isDeleting}
                    onPress={() => {
                      setShowDeleteModal(false);
                      setCurrentNarration(null);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`${isDark ? 'text-gray-200' : 'text-gray-700'} text-center font-medium`}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={currentNarration?.id ? handleDeleteNarrations : handleDeleteVideos}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 py-2 px-4 rounded-lg active:bg-red-700 disabled:opacity-50 flex-row items-center justify-center"
                  activeOpacity={0.7}
                >
                  {isDeleting ? <ActivityIndicator size="small" color="white" className="mr-2" /> : null}
                  <Text className="text-white text-center font-medium">{isDeleting ? 'Deleting...' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {selectedNote ? (
        <NoteDetail
          note={selectedNote}
          visible={true}
          onClose={() => setSelectedNote(null)}
          onDelete={() => {
            setCurrentNarration({ id: selectedNote.id, path: selectedNote.audio_path, thumbnailPath: selectedNote.image_path });
            setSelectedNote(null);
            setShowDeleteModal(true);
          }}
        />
      ) : null}

      {selectedVideo && videoUrl ? (
        <VideoPlayerWithNotes
          selectedVideo={selectedVideo}
          videoUrl={videoUrl}
          allVideos={videoItems}
          allVideoUrls={allVideoSignedUrls}
          onClose={() => {
            setSelectedVideo(null);
            setVideoUrl(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default MemoriesScreen;
