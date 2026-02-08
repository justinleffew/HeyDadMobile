import { useCallback } from 'react'
import { Image, View, Text, TouchableOpacity, ScrollView, StatusBar, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from 'hooks/useAuth';
import TryThisCard from 'components/TryThisCard';
import AudioPlayer from 'components/AudioPlayer';
import PocketDadCard from 'components/PocketDadCard';
import { getAllCategories } from 'constants';
import NotesModal from 'components/NotesModal';
import { getPromptsByCategory } from 'constants';
import VideoPlayerWithNotes from 'components/VideoPlayerWithNotes';
import { supabase } from 'utils/supabase';
import { useTheme } from 'providers/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfileAccess } from 'hooks/useProfileAccess';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PricingModal from 'components/PricingModal';

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

  const [prompt, setPrompt] = useState<string>("");
  const [shufflesLeft, setShufflesLeft] = useState<number>(5);
  const [promptCategory, setPromptCategory] = useState<string>("");
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
  const router = useRouter()
  const dailyKey = () => new Date().toISOString().slice(0, 10);

  const shufflePrompt = () => {
    const key = `hd.dailyPrompt.${dailyKey()}`;
    const cats = getAllCategories();
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const list = getPromptsByCategory(cat.id);
    const p = list[Math.floor(Math.random() * list.length)];
    const left = Math.max(0, shufflesLeft - 1);
    setPrompt(p);
    setPromptCategory(cat.name);
  };

  useEffect(() => {
    const cats = getAllCategories();
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const list = getPromptsByCategory(cat.id);
    const p = list[Math.floor(Math.random() * list.length)];
    setPrompt(p);
    setPromptCategory(cat.name);
    setShufflesLeft(5);
  }, [])

  const { user, trialStartDate, showPricingModal, setShowPricingModal } = useAuth()

  const getDateDiff = () => {
    if (trialStartDate) {
      const createdAt = new Date(trialStartDate)
      const endAt = createdAt.setMonth(new Date(trialStartDate).getMonth() + 1)
      const now = new Date()
      const diffMs = endAt - now
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
  }, [!user?.id]))

  useEffect(() => {
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
  }, [user?.id]);

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

  const { isPowerDad, videosRemaining, hasSubscription, subscriptionInterval, subscriptionType } = useProfileAccess()
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
      const diffMs = now - createdAt
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
        className={`flex-1 ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
        <View className="px-6 pt-4 mt-4">
          <Text
            className={`text-3xl font-merriweather ${isDark ? "text-gray-100" : "text-slate-800 "} mb-2`}>Home</Text>

          <Text className="text-gray-400 mb-6 leading-5 font-semibold">
            Record something now. Talk about a photo, add a quick note, or record a video
          </Text>
        </View>


        <View className="px-6">
          <LinearGradient
            colors={["#D4B996", "#C2A16C", "#D4B996"]}
            end={{ x: 1, y: 0 }}
            className="fflex-row overflow-hidden mb-6 rounded-2xl shadow-md"
            style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 24, paddingVertical: 16, paddingLeft: 14, paddingRight: 24, borderRadius: 16 }} >

            <View style={{ width: "70%" }}>

              {isPowerDad ?
                <Text className={`text-white font-bold`}>
                  You have unlimited stories
                </Text>
                :
                videosRemaining ?
                  <Text className={`text-white text-sm font-bold`}>
                    {typeof videosRemaining === 'number'
                      ? `You have ${videosRemaining} stories remaining`
                      : 'Videos remaining: Not set'}
                  </Text>
                  : <Text style={{ width: trialStartDate ? "90%" : "100%" }} className={`text-white font-bold`}>
                    {trialStartDate ? `You have ${Math.max(0, getDateDiff())} days left of your free trial` : "You have no stories available"}
                  </Text>
              }
              {
                !trialStartDate && !isPowerDad ?
                  <Text className={`mt-px ml-px text-white text-sm`}>
                    Purchase a story pack here
                  </Text>

                  : null}


            </View>


            <TouchableOpacity
              onPress={() => {
                setShowPricingModal(true)
              }}
              accessibilityRole="button"
              className="my-auto p-2 px-3 border items-center jusitfy-center bg-[#031329] rounded-full">
              <Text className={`text-white text-xs font-bold`}>
                {isPowerDad ? subscriptionType === "year" ? "Annual Plan" : "Monthly Plan" : "Get Story Pack"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <TryThisCard
            prompt={prompt}
            shufflePrompt={shufflePrompt}
            onRecord={() => router.replace({
              pathname: "(tabs)/memories/capture",
              params: {
                defaultTab: 'audio',
                selectedPrompt: prompt
              }
            })}
            onBrowseAll={() => router.replace('/(tabs)/memories/ideas')}
          />
        </View>

        <PocketDadCard onPressCta={
          () => router.replace("(tabs)/saythis")
        } />

        <View className="px-6">
          <Text className={`${isDark ? "text-gray-100" : "text-slate-800 "} text-xl font-semibold font-merriweather mb-4`}>
            Record Your Own Thing
          </Text>
          <View className="flex-row items-center h-32 w-full">

            <Link href={{
              pathname: "(tabs)/memories/capture",
              params: { defaultTab: "audio" }
            }} asChild>
              <TouchableOpacity
                style={{
                  borderColor: "rgba(113,124,142,0.2)"
                }}
                className={`border h-full flex-1 rounded-xl items-center justify-center ${isDark ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                <View className={`${isDark ? 'bg-gray-900' : 'bg-slate-800'}  w-16 h-16 rounded-full items-center justify-center`}>
                  <Ionicons name="image-outline" size={20} color="white" />
                </View>
                <Text className={`text-sm mt-2 font-semibold ${isDark ? "text-gray-100" : "text-slate-800 "}`}>Tell a Story</Text>
              </TouchableOpacity>
            </Link>
            <Link
              href={{
                pathname: "(tabs)/memories/capture",
                params: { defaultTab: "video" }
              }}
              asChild>
              <TouchableOpacity
                style={{
                  borderColor: "rgba(113,124,142,0.2)"
                }}
                className={`border ml-2  ${isDark ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-100'} h-full flex-1 rounded-xl items-center justify-center`}>
                <View className={`${isDark ? 'bg-gray-900' : 'bg-slate-800'}  w-16 h-16 rounded-full items-center justify-center`}>
                  <Ionicons name="videocam-outline" size={20} color="white" />
                </View>
                <Text className={`text-sm mt-2 font-semibold ${isDark ? "text-gray-100" : "text-slate-800 "}`}>Video Story</Text>
              </TouchableOpacity>
            </Link>

            <Link
              href={{
                pathname: "(tabs)/memories/capture",
                params: { defaultTab: "note" }
              }} asChild>
              <TouchableOpacity
                style={{
                  borderColor: "rgba(113,124,142,0.2)"
                }}
                className={`border ml-2  ${isDark ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-100'} h-full flex-1 rounded-xl items-center justify-center`}>
                <View className={`${isDark ? 'bg-gray-900' : 'bg-slate-800'}  w-16 h-16 rounded-full items-center justify-center`}>
                  <Ionicons name="pencil-outline" size={20} color="white" />
                </View>
                <Text className={`text-sm mt-2 font-semibold ${isDark ? "text-gray-100" : "text-slate-800 "}`}>Write a Story</Text>
              </TouchableOpacity>
            </Link>
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
