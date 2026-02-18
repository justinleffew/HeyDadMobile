import { useCallback } from 'react'
import { Image, View, Text, TouchableOpacity, ScrollView, StatusBar, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from 'hooks/useAuth';
import AudioPlayer from 'components/AudioPlayer';
import NotesModal from 'components/NotesModal';
import VideoPlayerWithNotes from 'components/VideoPlayerWithNotes';
import { supabase } from 'utils/supabase';
import { useTheme } from 'providers/ThemeProvider';
// LinearGradient removed — no longer used after hero CTA redesign
import { useProfileAccess } from 'hooks/useProfileAccess';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PricingModal from 'components/PricingModal';

const STORY_PROMPTS = [
  {
    emoji: "\u{1F4D6}",
    title: "Read Their Favorite Book",
    subtitle: "Record yourself reading it aloud — trust us, they'll replay this forever"
  },
  {
    emoji: "\u{1F602}",
    title: "The Funniest Thing They Ever Did",
    subtitle: "That story you always tell at family dinners? Record it."
  },
  {
    emoji: "\u{1F3C6}",
    title: "The Moment You Were Most Proud",
    subtitle: "Tell them about the day they blew you away"
  },
  {
    emoji: "\u{1F319}",
    title: "Tonight's Bedtime Story",
    subtitle: "Make one up, read one, or just say goodnight — they'll love it"
  },
  {
    emoji: "\u{1F4AA}",
    title: "When Life Gets Hard",
    subtitle: "The advice you'd give them when they're struggling and you're not there"
  },
  {
    emoji: "\u{1F389}",
    title: "Your Favorite Birthday Memory",
    subtitle: "A birthday party, a gift, a cake disaster — whatever makes you smile"
  },
  {
    emoji: "\u{1F3E0}",
    title: "What Home Means to You",
    subtitle: "The house, the people, the feeling — paint them a picture"
  },
  {
    emoji: "\u26BE",
    title: "Teach Them Something",
    subtitle: "How to throw a ball, tie a tie, change a tire — show them your moves"
  },
  {
    emoji: "\u2708\uFE0F",
    title: "The Best Trip You Ever Took",
    subtitle: "Take them somewhere they've never been through your story"
  },
  {
    emoji: "\u2764\uFE0F",
    title: "Why You Wanted to Be a Dad",
    subtitle: "The real reason — not the Hallmark version"
  }
];

function pickRandomPrompts(count: number) {
  const shuffled = [...STORY_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function HomeScreen() {

  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  type Narr = {
    id: string;
    title: string | null;
    notes: string | null;
    image_path: string | null;
    audio_path: string | null;
    duration_seconds: number | null;
    created_at: string;
  };

  type Vid = {
    id: string;
    title: string | null;
    thumbnail_url: string | null;
    duration: number | null;
    created_at: string;
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
        <Text className={`mt-2 text-center text-base mb-8 leading-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{text}</Text>

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

  const [activePrompts, setActivePrompts] = useState(() => pickRandomPrompts(4));
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedNote, setSelectedNote] = useState<any>(null);


  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentVideo, setCurrentVideo] = useState({});
  const [currentNarration, setCurrentNarration] = useState(null);
  const [childFilter, setChildFilter] = useState('all');
  const [children, setChildren] = useState<any[]>([]);
  const [videos, setVideos] = useState<Vid[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tab, setTab] = useState<"all" | "audio" | "video" | "note">("audio");
  const [narrations, setNarrations] = useState<Narr[]>([]);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string | null>>({});
  const [childAvatars, setChildAvatars] = useState<Record<string, string | null>>({});
  const [childCounts, setChildCounts] = useState<any[]>([]);
  const router = useRouter()

  const { user, trialStartDate, showPricingModal, setShowPricingModal } = useAuth()

  const getDateDiff = () => {
    if (trialStartDate) {
      const createdAt = new Date(trialStartDate)
      const endAt = createdAt.setMonth(new Date(trialStartDate).getMonth() + 1)
      const now = new Date()
      const diffMs = endAt - now.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      return diffDays
    }
    return 30
  }


  const loadThumbnails = async (videoList: any[]) => {
    const thumbnailPromises = videoList.map(async (video) => {
      if (video.thumbnail_path) {
        try {
          const { data, error } = await supabase.storage
            .from("videos")
            .createSignedUrl(video.thumbnail_path, 3600);
          if (!error && data) return { id: video.id, url: data.signedUrl };
        } catch (error) {
          console.error("Error loading thumbnail:", error);
        }
      }
      return { id: video.id, url: null };
    });

    const thumbnailResults = await Promise.all(thumbnailPromises);
    const map: Record<string, string | null> = {};
    thumbnailResults.forEach((r) => (map[r.id] = r.url));
    setThumbnailUrls(map);
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(
          `
          *,
          video_children (
            children ( id, name, birthdate )
          )
        `
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
      if (data && data.length > 0) loadThumbnails(data);
      return { data, error };
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => {
    setActivePrompts(pickRandomPrompts(4));
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const [nRes, vRes, kidsRes, countsRes] = await Promise.all([
        supabase
          .from("narrations")
          .select("id,title,notes,image_path,audio_path,duration_seconds,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        fetchVideos(),

        supabase
          .from("children")
          .select("id,name,image_path")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase.from("child_memory_counts").select("*").eq("user_id", user.id),
      ]);

      if (!nRes.error && nRes.data) setNarrations(nRes.data as Narr[]);
      if (!vRes.error && vRes.data) setVideos(vRes?.data as Vid[]);

      const kids = kidsRes?.data || [];
      setChildren(kids);
      buildChildAvatarMap(kids);

      const merged = (countsRes?.data || []).map((r: any) => ({
        ...r,
        name: kids.find((k: any) => k.id === r.child_id)?.name || "Child",
      }));
      setChildCounts(merged);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]))

  async function buildChildAvatarMap(kids: { id: string; image_path?: string | null }[]) {
    const map: Record<string, string | null> = {};
    for (const k of kids) {
      if (!k.image_path) {
        map[k.id] = null;
        continue;
      }
      try {
        const { data, error } = await supabase.storage
          .from("child-images")
          .createSignedUrl(k.image_path, 3600);
        map[k.id] = error ? null : data?.signedUrl ?? null;
      } catch {
        map[k.id] = null;
      }
    }
    setChildAvatars(map);
  }

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

  const audio = narrations.filter((n) => n.image_path);
  const notes = narrations.filter((n) => !n.image_path);

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

  const [isModalVisible, setIsModalVisible] = useState(false)

  const { isPowerDad, videosRemaining, hasSubscription, subscriptionInterval } = useProfileAccess()
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftCode, setGiftCode] = useState("")
  const [giftCodeStatus, setGiftCodeStatus] = useState("checking");
  const [showGiftCodeStatus, setShowGiftCodeStatus] = useState(false);

  const [dismissedHydrated, setDismissedHydrated] = useState(false);
  const [isTrial, setIsTrial] = useState(true)

  const isSubscribed = hasSubscription || isPowerDad
  const showModalRepeatedly = isTrial || (!isSubscribed && !videosRemaining)

  const PRICING_DISMISSED_KEY = "pricingPopupDismissedIfNotPaid";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsModalVisible(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (user) {
      const createdAt = new Date(user.created_at)
      const now = new Date()
      const diffMs = now.getTime() - createdAt.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) {
        setIsTrial(true)
      } else {
        setIsTrial(false)
      }
    }
  }, [user])

  useEffect(() => {
    const loadDismissedState = async () => {
      try {
        if (isSubscribed || videosRemaining) {
          setShowPricingModal(false);
        } else {
          setShowPricingModal(true)
        }
      } catch (error) {
        console.warn("Failed to load onboarding popup dismissal state", error);
      } finally {
        setDismissedHydrated(true);
      }
    };
    loadDismissedState();
  }, [isSubscribed, videosRemaining]);


  return (
    <View className="flex-1">
      <StatusBar barStyle="light" backgroundColor="#1e293b" />
      <ScrollView
        stickyHeaderIndices={[1]}
        className={`flex-1`}
        style={{ backgroundColor: isDark ? '#111827' : '#F8F7F5' }}>
        <View className="px-6 pt-4 mt-4">
          <Text
            className={`text-3xl font-merriweather ${isDark ? "text-gray-100" : "text-slate-800 "} mb-2`}>Home</Text>

          <Text className="text-gray-400 mb-6 leading-5 font-semibold">
            One day, this will mean everything.
          </Text>
        </View>


        <View className="px-6">
          {/* Hero CTA — personalized recording prompt */}
          <View
            style={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#e8e5e0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.10,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="videocam" size={20} color="#c4a471" />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#c4a471' }}>
                TODAY'S STORY
              </Text>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: isDark ? '#f3f4f6' : '#1e293b',
                marginBottom: 4,
              }}
            >
              {children.length > 0
                ? `Record a video for ${children[0].name}`
                : 'Record your first story'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? '#9ca3af' : '#6b7280',
                marginBottom: 16,
                lineHeight: 20,
              }}
            >
              {children.length > 0
                ? "They'll thank you for this someday."
                : 'Add a child in the Children tab to get started.'}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '(tabs)/memories/capture',
                  params: { defaultTab: 'video' },
                })
              }
              activeOpacity={0.8}
              style={{
                backgroundColor: '#c4a471',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="videocam-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Start Recording</Text>
            </TouchableOpacity>
          </View>

          <Text className={`${isDark ? "text-gray-100" : "text-slate-800"} text-xl font-semibold font-merriweather mb-4`}>
            Story Prompts
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
            {activePrompts.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => router.replace({
                  pathname: "(tabs)/memories/capture",
                  params: {
                    defaultTab: 'audio',
                    selectedPrompt: p.title
                  }
                })}
                activeOpacity={0.7}
                style={{
                  width: '48%',
                  marginBottom: 12,
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#e8e5e0',
                  borderLeftWidth: 3,
                  borderLeftColor: '#c4a471',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? '#374151' : '#FBF7F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
                </View>
                <Text
                  style={{ fontSize: 15, fontWeight: '700', marginBottom: 4, color: isDark ? '#f3f4f6' : '#1e293b' }}
                  numberOfLines={2}
                >
                  {p.title}
                </Text>
                <Text
                  style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', lineHeight: 16 }}
                  numberOfLines={3}
                >
                  {p.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Your Legacy So Far — stats section */}
        <View className="px-6 mt-2 mb-4">
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: isDark ? '#f3f4f6' : '#1e293b',
              marginBottom: 14,
              fontFamily: 'merriweather',
            }}
          >
            Your Legacy So Far
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              {
                label: 'Total Stories',
                value: videos.length + narrations.length,
                icon: 'book-outline' as const,
              },
              {
                label: 'This Month',
                value: (() => {
                  const now = new Date();
                  const thisMonth = now.getMonth();
                  const thisYear = now.getFullYear();
                  return (
                    videos.filter((v) => {
                      const d = new Date(v.created_at);
                      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                    }).length +
                    narrations.filter((n) => {
                      const d = new Date(n.created_at);
                      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                    }).length
                  );
                })(),
                icon: 'calendar-outline' as const,
              },
              {
                label: 'Kids Watching',
                value: children.length,
                icon: 'people-outline' as const,
              },
            ].map((stat, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  borderRadius: 14,
                  padding: 16,
                  marginHorizontal: i === 1 ? 8 : 0,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#e8e5e0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? '#374151' : '#FBF7F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name={stat.icon} size={18} color="#c4a471" />
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: isDark ? '#f3f4f6' : '#1e293b',
                    marginBottom: 2,
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isDark ? '#9ca3af' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-6 mt-4">
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
              setSelectedVideo={setSelectedVideo}
              onClose={() => {
                setSelectedVideo(null);
                setVideoUrl(null);
              }}
            />
          ) : null}

        </View>

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>

      <PricingModal
        showModalRepeatedly={showModalRepeatedly}
        hasSubscription={hasSubscription}
        currentPlan={subscriptionInterval}
        isOpen={showPricingModal && isModalVisible}
        setIsOpen={setShowPricingModal}
        showGiftModal={() => setShowGiftModal(true)}
      />
    </View>
  );
}
