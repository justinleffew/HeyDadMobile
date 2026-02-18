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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useAuth } from 'hooks/useAuth';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from 'utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import NotesModal from 'components/NotesModal';
import AudioPlayer from 'components/AudioPlayer';
import VideoPlayerWithNotes from 'components/VideoPlayerWithNotes';
import { useTheme } from '../../../providers/ThemeProvider';
import { useLocalSearchParams } from 'expo-router'

const formatDuration = (seconds) => {
  const s = Number(seconds || 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

const Empty = ({ title, text, buttonText, isDark }: { title: string; text: string; buttonText: string; isDark: boolean }) => {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <View className={`p-4 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-200'}`}>
        <Ionicons name="camera-outline" size={40} color="#c4a471" />
      </View>
      <Text className={`mt-4 font-merriweather text-xl font-medium text-center ${isDark ? 'text-gray-100' : 'text-slate-600'}`}>
        {title}
      </Text>
      <Text className={`mt-2 text-center text-base mb-8 leading-6 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{text}</Text>

      <Link asChild href="/(tabs)/memories/capture">
        <TouchableOpacity className="bg-slate-800 rounded-lg py-4 px-8" activeOpacity={0.8}>
          <View className="flex-row items-center">
            <Ionicons name="videocam-outline" size={20} color="white" />
            <Text className="text-white font-medium ml-2">{buttonText}</Text>
          </View>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

const NotesList = ({
  noteItems,
  onNoteSelected,
  setShowDeleteModal,
  setCurrentNarration,
  isDark,
  cardSurface,
  primaryTextClass,
  metadataTextClass,
}: {
  noteItems: any[];
  onNoteSelected: (note: any) => void;
  setShowDeleteModal: (value: boolean) => void;
  setCurrentNarration: (value: any) => void;
  isDark: boolean;
  cardSurface: string;
  primaryTextClass: string;
  metadataTextClass: string;
}) => {
  const deleteIconColor = isDark ? '#9ca3af' : '#9ca3af';
  const placeholderBackground = isDark ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <View className="flex-1 gap-4 px-4 mt-4">
      {noteItems.length ?
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28, gap: 16 }}>
          {
            noteItems.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => onNoteSelected(n)}
                activeOpacity={0.7}
                className={`${cardSurface} rounded-lg p-4`}
              >
                <View className={`relative aspect-video w-full rounded-lg overflow-hidden mb-4 ${isDark ? 'bg-gray-900' : 'bg-gray-800'}`}>
                  {n.image_path ? (
                    <SignedImage path={n.image_path} bucket="images" />
                  ) : (
                    <View className={`${placeholderBackground} overflow-hidden w-full h-full flex items-center justify-center`}>
                      <LinearGradient
                        colors={['#D4B996', '#C2A16C', '#D4B996']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="overflow-hidden h-16 w-16 rounded-full flex items-center justify-center"
                        style={{ borderRadius: 32, width: 64, height: 64, justifyContent: "center", alignItems: "center" }}
                      >
                        <Ionicons name="pencil-outline" size={24} color="white" />
                      </LinearGradient>
                    </View>
                  )}
                </View>

                <Text className={`text-xl font-bold mb-1 ${primaryTextClass}`}>{n.title || 'Untitled Story'}</Text>

                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center">
                    <Text className={`text-sm ml-1.5 ${metadataTextClass}`}>{new Date(n.created_at).toLocaleDateString()}</Text>
                  </View>

                  <View className="flex-row items-center">
                    <Text className={`text-sm ml-1.5 ${metadataTextClass}`}></Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setShowDeleteModal(true);
                      setCurrentNarration({
                        id: n.id,
                        path: n.audio_path,
                        thumbnailPath: n.image_path,
                      });
                    }}
                    className="ml-auto p-2"
                    activeOpacity={0.5}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={deleteIconColor} />
                  </TouchableOpacity>
                </View>

                {n.audio_path ? (
                  <View className="mt-3 w-full">
                    <SignedAudio path={n.audio_path} bucket="audio" />
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          }
        </ScrollView>
        : <Empty
          title="Make Your Quick Note"
          text="Create a special moment for your children to discover later. Create a quick note, share your wisdom, or capture a milestone. "
          buttonText="Make your first Quick Note"
          isDark={isDark}
        />
      }
    </View>
  );
};

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
  return url ? <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" /> : null;
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

const VideoList = ({
  videoItems = [],
  thumbnailUrls = [],
  children = [],
  setShowDeleteModal,
  setCurrentVideo,
  handlePlayVideo,
  isDark,
  cardSurface,
  metadataTextClass,
}: {
  videoItems: any[];
  thumbnailUrls: Record<string, string>;
  children: any[];
  setShowDeleteModal: (value: boolean) => void;
  setCurrentVideo: (value: any) => void;
  handlePlayVideo: (value: any) => void;
  isDark: boolean;
  cardSurface: string;
  metadataTextClass: string;
}) => {
  const deleteIconColor = isDark ? '#9ca3af' : '#9ca3af';
  const metaIconColor = isDark ? '#d1d5db' : '#1a1a1a';

  return (
    <View className="flex-1 gap-4 p-4">
      {videoItems.length ?
        <FlatList
          data={videoItems}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16 }}
          renderItem={({ item: v }) => (
            <View
              className={`${cardSurface} rounded-lg p-4`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePlayVideo(v)}
                className="w-full relative aspect-video rounded-lg overflow-hidden mb-4"
                style={{ backgroundColor: isDark ? '#111827' : '#1e293b' }}
              >
                {thumbnailUrls[v.id] ? (
                  <View className="w-full h-full">
                    <Image source={{ uri: thumbnailUrls[v.id] }} className="w-full h-full" resizeMode="cover" />
                    <View className="absolute inset-0 items-center justify-center">
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: 'rgba(255,255,255,0.85)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 4,
                        }}
                      >
                        <Ionicons name="play" size={28} color="#1B2838" style={{ marginLeft: 3 }} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="w-full h-full flex items-center justify-center">
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: 'rgba(255,255,255,0.85)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="play" size={28} color="#1B2838" style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                )}

                <View className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/75 flex-row items-center">
                  <Text className="text-sm font-medium text-white">{formatDuration(v.duration)}</Text>
                </View>
              </TouchableOpacity>

              <Text className={`text-xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-dad-dark'}`} numberOfLines={2}>
                {v.title || 'Untitled Story'}
              </Text>

              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={16} color={metaIconColor} />
                  <Text className={`text-sm ml-1.5 ${metadataTextClass}`}>{new Date(v.created_at).toLocaleDateString()}</Text>
                </View>

                <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={16} color={metaIconColor} />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setShowDeleteModal(true);
                    setCurrentVideo({
                      id: v.id,
                      path: v.file_path,
                      thumbnailPath: v.thumbnail_path,
                    });
                  }}
                  className="ml-auto p-2"
                  activeOpacity={0.5}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={deleteIconColor} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        :
        <Empty
          title="Record Your First Video"
          text="Capture your voice and share a heartfelt message that your children can revisit over and over."
          buttonText="Make your first video"
          isDark={isDark}
        />
      }
    </View>
  );
};

const NarrationList = ({
  audioItems,
  children,
  setShowDeleteModal,
  setCurrentNarration,
  isDark,
  cardSurface,
  metadataTextClass,
  getUnlockStatus,
}: {
  audioItems: any[];
  children: any[];
  setShowDeleteModal: (value: boolean) => void;
  setCurrentNarration: (value: any) => void;
  isDark: boolean;
  cardSurface: string;
  metadataTextClass: string;
  getUnlockStatus: (item: any) => { isUnlocked: boolean; label: string };
}) => {
  const deleteIconColor = isDark ? '#9ca3af' : '#9ca3af';
  const metaIconColor = isDark ? '#d1d5db' : '#1a1a1a';
  const placeholderBackground = isDark ? 'bg-gray-900' : 'bg-slate-800';

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}
      className="flex-1 gap-4 px-4 mt-4">
      {audioItems.length ?
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28, gap: 16 }}>
          {
            audioItems.map((n) => (
              <View key={n.id} className={`${cardSurface} rounded-lg p-4`}>
                <View className={`w-full relative aspect-video rounded-lg overflow-hidden mb-4 ${placeholderBackground}`}>
                  {n.image_path ? (
                    <SignedImage path={n.image_path} bucket="images" />
                  ) : (
                    <View className="w-full h-full flex items-center justify-center">
                      <Ionicons name="play" size={32} color={isDark ? '#9ca3af' : '#9ca3af'} />
                    </View>
                  )}

                  <View className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/75 flex-row items-center">
                    <Ionicons name="time" size={16} color="white" />
                    <Text className="text-sm font-medium text-white ml-1">{formatDuration(n.duration_seconds)}</Text>
                  </View>

                  <View className="absolute top-2 right-2">
                    <UnlockBadge item={n} getUnlockStatus={getUnlockStatus} />
                  </View>
                </View>

                <Text className={`text-xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-dad-dark'}`}>{n.title || 'Untitled Story'}</Text>

                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={16} color={metaIconColor} />
                    <Text className={`text-sm ml-1.5 ${metadataTextClass}`}>{new Date(n.created_at).toLocaleDateString()}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setShowDeleteModal(true);
                      setCurrentNarration({
                        id: n.id,
                        path: n.audio_path,
                        thumbnailPath: n.image_path,
                      });
                    }}
                    className="ml-auto p-2"
                    activeOpacity={0.5}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={deleteIconColor} />
                  </TouchableOpacity>
                </View>

                {n.audio_path ? (
                  <View className="mt-3 w-full">
                    <SignedAudio path={n.audio_path} bucket="audio" />
                  </View>
                ) : null}
              </View>
            ))
          }
        </ScrollView>

        : <Empty
          title="Record Your First Narration"
          text="Capture your voice and share a heartfelt message that your children can revisit over and over."
          buttonText="Make your first narration"
          isDark={isDark}
        />
      }

    </View>
  );
};

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

const MemoriesScreen = () => {
  const { user, signOut } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
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
    //
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
      if (sortBy === 'unlock_earliest') {
        const da = a.unlock_date ? new Date(a.unlock_date) : new Date(0);
        const db = b.unlock_date ? new Date(b.unlock_date) : new Date(0);
        return Number(da) - Number(db);
      }
      if (sortBy === 'unlock_latest') {
        const da = a.unlock_date ? new Date(a.unlock_date) : new Date(0);
        const db = b.unlock_date ? new Date(b.unlock_date) : new Date(0);
        return Number(db) - Number(da);
      }
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
      if (videoPathError) {
        console.error('Storage delete error:', videoPathError);
      }

      const { error: thumbnailPathError } = await supabase.storage.from('videos').remove([currentVideo?.thumbnailPath]);
      if (thumbnailPathError) {
        console.error('Storage delete error:', thumbnailPathError);
      }

      setVideos((prevVideos) => prevVideos.filter((item) => item.id !== currentVideo?.id));
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
      if (audioPathError) {
        console.error('Storage delete error:', audioPathError);
      }

      const { error: thumbnailPathError } = await supabase.storage.from('images').remove([currentNarration?.thumbnailPath]);
      if (thumbnailPathError) {
        console.error('Storage delete error:', thumbnailPathError);
      }

      setNarrations((prevNarrations) => prevNarrations.filter((item) => item.id !== currentNarration?.id));
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

  const handlePlayVideo = async (video) => {
    if (!video) return;
    try {
      const { data, error } = await supabase.storage.from('videos').createSignedUrl(video.file_path, 3600);
      if (error) throw error;
      setSelectedVideo(video);
      setVideoUrl(data?.signedUrl || null);
    } catch (err) {
      console.error('Error playing video:', err);
    }
  };

  const surfaceCard = isDark ? 'bg-[#1f2937] border border-gray-700' : 'bg-white border border-gray-200';
  const metadataTextClass = isDark ? 'text-gray-300' : 'text-dad-dark';
  const headingTextClass = isDark ? 'text-gray-100' : 'text-gray-800';
  const screenBackground = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const chipInactiveBorder = isDark ? 'border border-gray-600' : 'border border-gray-300';
  const chipInactiveText = isDark ? 'text-gray-300' : 'text-gray-800';

  return (
    <SafeAreaView className={`flex-1 ${screenBackground}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1f2937' : '#1e293b'} />

      <Text className={`text-4xl px-4 text-center font-merriweather mt-6 mb-2 ${isDark ? 'text-gray-100' : 'text-slate-600'}`}>Stories</Text>

      <View className="flex-1 px-4 pb-6">
        <View className={`rounded-lg mt-2 p-4 shadow-sm ${isDark ? 'bg-[#1f2937] border border-gray-700' : 'bg-white'}`}>
          <Link
            href={{
              pathname: "/(tabs)/memories/capture",
              params: { defaultTab: "audio" }
            }}
            asChild>
            <TouchableOpacity
              style={{ marginTop: 8, borderRadius: 8, backgroundColor: '#c4a471' }}
              className="rounded-xl py-3"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-white font-medium ml-2">Tell a Story</Text>
              </View>
            </TouchableOpacity>
          </Link>

          <View className="flex-row">
            <Link
              href={{
                pathname: "/(tabs)/memories/capture",
                params: { defaultTab: "video" }
              }}
              asChild>
              <TouchableOpacity
                style={{ marginTop: 8, borderRadius: 8 }}
                className={`flex-1 rounded-xl py-3 border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  <Text className={`${isDark ? 'text-gray-100' : 'text-gray-800'} font-semibold ml-2`}>Video Story</Text>
                </View>
              </TouchableOpacity>
            </Link>

            <Link
              href={{
                pathname: "/(tabs)/memories/capture",
                params: { defaultTab: "note" }
              }} asChild>
              <TouchableOpacity
                style={{ marginTop: 8, borderRadius: 8 }}
                className={`ml-4 flex-1 rounded-xl py-3 border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  <Text className={`${isDark ? 'text-gray-100' : 'text-gray-800'} font-medium ml-2`}>Write a Story</Text>
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <Text className={`${isDark ? "text-gray-100" : "text-slate-800 "} mt-6  text-xl font-semibold font-merriweather mb-4`}>
          Recorded Stories
        </Text>

        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setTab('video')}
            className={`rounded-md min-w-20 h-10 p-2 items-center justify-center ${tab === 'video' ? 'bg-gray-800' : chipInactiveBorder
              }`}
            activeOpacity={0.8}
          >
            <Text className={`${tab === 'video' ? 'text-white' : chipInactiveText} text-sm font-semibold`}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('audio')}
            className={`ml-2 rounded-md min-w-20 h-10 p-2 items-center justify-center ${tab === 'audio' ? 'bg-gray-800' : chipInactiveBorder
              }`}
            activeOpacity={0.8}
          >
            <Text className={`${tab === 'audio' ? 'text-white' : chipInactiveText} text-sm font-semibold`}>Narration</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('note')}
            className={`ml-2 rounded-md min-w-20 h-10 p-2 items-center justify-center ${tab === 'note' ? 'bg-gray-800' : chipInactiveBorder
              }`}
            activeOpacity={0.8}
          >
            <Text className={`${tab === 'note' ? 'text-white' : chipInactiveText} text-sm font-semibold`}>Quick Note</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className={headingTextClass}>Loading...</Text>
          </View>
        ) : tab === 'video' ? (
          <VideoList
            videoItems={videoItems}
            thumbnailUrls={thumbnailUrls}
            children={children}
            setShowDeleteModal={setShowDeleteModal}
            setCurrentVideo={setCurrentVideo}
            handlePlayVideo={handlePlayVideo}
            isDark={isDark}
            cardSurface={surfaceCard}
            metadataTextClass={metadataTextClass}
          />
        ) : tab === 'audio' ? (
          <NarrationList
            audioItems={audioItems}
            children={children}
            setShowDeleteModal={setShowDeleteModal}
            setCurrentNarration={setCurrentNarration}
            isDark={isDark}
            cardSurface={surfaceCard}
            metadataTextClass={metadataTextClass}
            getUnlockStatus={getUnlockStatus}
          />
        ) : tab === 'note' ? (
          <NotesList
            noteItems={noteItems}
            onNoteSelected={handleNoteSelected}
            setShowDeleteModal={setShowDeleteModal}
            setCurrentNarration={setCurrentNarration}
            isDark={isDark}
            cardSurface={surfaceCard}
            primaryTextClass={headingTextClass}
            metadataTextClass={metadataTextClass}
          />
        ) : (
          <Empty
            title="Start Your First Story"
            text="Create a special moment for your children to discover later. Record a video message, share your wisdom, or capture a milestone. "
            buttonText="Record Your First Story"
            isDark={isDark}
          />
        )}
      </View>

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
        <NotesModal
          {...selectedNote}
          onClose={() => {
            setSelectedNote(null);
          }}
        />
      ) : null}

      {selectedVideo && videoUrl ? (
        <VideoPlayerWithNotes
          selectedVideo={selectedVideo}
          videoUrl={videoUrl}
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
