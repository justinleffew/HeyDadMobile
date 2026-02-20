import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from 'utils/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const KIDS_SESSION_KEY = 'kids_session';

type KidSession = {
  childId: string;
  childName: string;
  parentId: string;
  birthdate: string;
};

type FeedItem = {
  id: string;
  type: 'video' | 'audio' | 'locked' | 'empty';
  title: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
};

function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function isUnlocked(item: any, childBirthdate: string): boolean {
  const { unlock_type, unlock_age, unlock_date } = item || {};
  if (!unlock_type || unlock_type === 'now') return true;
  if (unlock_type === 'date') {
    return unlock_date ? new Date() >= new Date(unlock_date) : true;
  }
  if (unlock_type === 'age') {
    return calculateAge(childBirthdate) >= Number(unlock_age || 0);
  }
  if (unlock_type === 'milestone') return false;
  return true;
}

// Heart animation component
function HeartBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1.5, { duration: 400 });
    translateY.value = withTiming(-60, { duration: 600 });
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 400 }),
    );
    const timer = setTimeout(() => onDone(), 650);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x - 25,
    top: y - 25,
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    zIndex: 100,
    pointerEvents: 'none' as const,
  }));

  return (
    <Animated.View style={animStyle}>
      <Text style={{ fontSize: 50 }}>{'\u2764\uFE0F'}</Text>
    </Animated.View>
  );
}

// Play/Pause overlay
function PlayPauseOverlay({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(0.7, { duration: 100 }),
        withTiming(0, { duration: 500 }),
      );
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[style, {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        pointerEvents: 'none',
      }]}
    >
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Ionicons name="play" size={40} color="white" />
      </View>
    </Animated.View>
  );
}

// Single feed item renderer
function FeedVideoItem({
  item,
  isActive,
  onDoubleTap,
}: {
  item: FeedItem;
  isActive: boolean;
  onDoubleTap: (x: number, y: number, memoryId: string) => void;
}) {
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (item.type !== 'video' || !videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => {});
      setIsPaused(false);
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive, item.type]);

  const handleTap = (evt: any) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap
      const { locationX, locationY } = evt.nativeEvent;
      onDoubleTap(locationX, locationY, item.id);
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;

    // Single tap — toggle play/pause with delay
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY - 50) {
        if (item.type === 'video' && videoRef.current) {
          if (isPaused) {
            videoRef.current.playAsync().catch(() => {});
            setIsPaused(false);
          } else {
            videoRef.current.pauseAsync().catch(() => {});
            setIsPaused(true);
            setShowPauseOverlay(true);
            setTimeout(() => setShowPauseOverlay(false), 100);
          }
        }
      }
    }, DOUBLE_TAP_DELAY);
  };

  if (item.type === 'locked') {
    return (
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <Ionicons name="lock-closed" size={36} color="#c4a471" />
        </View>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 8 }}>
          More stories are coming!
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 16 }}>
          {'\u{1F382}'}
        </Text>
      </View>
    );
  }

  if (item.type === 'empty') {
    return (
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 24 }}
          resizeMode="cover"
        />
        <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
          No stories yet
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 16, textAlign: 'center', lineHeight: 22 }}>
          Dad hasn't recorded any stories yet — ask him to make one!
        </Text>
      </View>
    );
  }

  if (item.type === 'audio') {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#0f172a' }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'absolute' }}
            resizeMode="cover"
          />
        ) : null}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={{ flex: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 50 }}
          >
            {item.title ? (
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>{item.title}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Ionicons name="musical-notes-outline" size={16} color="#c4a471" />
              <Text style={{ color: '#c4a471', fontSize: 13, marginLeft: 6 }}>Audio Story</Text>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  }

  // Video type
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleTap}
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000000' }}
    >
      {item.videoUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          resizeMode="cover"
          isLooping
          shouldPlay={isActive}
          isMuted={false}
        />
      ) : item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#c4a471" />
        </View>
      )}

      <PlayPauseOverlay visible={showPauseOverlay} />

      {/* Bottom gradient with title */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 }}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={{ flex: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 50 }}
        >
          {item.title ? (
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>{item.title}</Text>
          ) : null}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

export default function KidsFeedScreen() {
  const [session, setSession] = useState<KidSession | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const loveBatchRef = useRef<Record<string, number>>({});
  const loveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load kid session
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KIDS_SESSION_KEY);
        if (!raw) {
          router.replace('/kids/code-entry');
          return;
        }
        const parsed: KidSession = JSON.parse(raw);
        setSession(parsed);
      } catch {
        router.replace('/kids/code-entry');
      }
    })();
  }, []);

  // Fetch content
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        setLoading(true);

        // 1. Use session data instead of re-querying children table (RLS blocks anon reads)
        const child = {
          id: session.childId,
          name: session.childName,
          user_id: session.parentId,
          birthdate: session.birthdate,
        };

        // 2. Fetch video assignments for this child
        const { data: videoChildren } = await supabase
          .from('video_children')
          .select('video_id')
          .eq('child_id', child.id);

        const videoIds = (videoChildren || []).map((vc: any) => vc.video_id);

        // 3. Fetch videos and narrations in parallel
        const [videosRes, narrationsRes] = await Promise.all([
          videoIds.length > 0
            ? supabase
                .from('videos')
                .select('id, title, notes, file_path, thumbnail_path, cloudflare_video_id, created_at, unlock_type, unlock_age, unlock_date')
                .in('id', videoIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('narrations')
            .select('id, title, notes, audio_path, image_path, created_at, unlock_type, unlock_age, unlock_date, selected_children')
            .eq('user_id', child.user_id)
            .order('created_at', { ascending: false }),
        ]);

        const videos = videosRes.data || [];
        const allNarrations = narrationsRes.data || [];

        // Filter narrations assigned to this child
        const narrations = allNarrations.filter((n: any) => {
          if (!n.selected_children) return false;
          return Array.isArray(n.selected_children) && n.selected_children.includes(child.id);
        });

        // 4. Build feed items with unlock filtering
        const items: FeedItem[] = [];
        let hasLockedContent = false;

        // Process videos
        for (const video of videos) {
          if (isUnlocked(video, child.birthdate)) {
            let videoUrl: string | null = null;
            let thumbnailUrl: string | null = null;

            // Get signed URL for video file
            if (video.file_path) {
              const { data } = await supabase.storage
                .from('videos')
                .createSignedUrl(video.file_path, 3600);
              videoUrl = data?.signedUrl || null;
            }

            if (video.thumbnail_path) {
              const { data } = await supabase.storage
                .from('videos')
                .createSignedUrl(video.thumbnail_path, 3600);
              thumbnailUrl = data?.signedUrl || null;
            }

            items.push({
              id: video.id,
              type: 'video',
              title: video.title,
              videoUrl,
              thumbnailUrl,
              createdAt: video.created_at,
            });
          } else {
            hasLockedContent = true;
          }
        }

        // Process narrations with audio
        for (const narration of narrations) {
          if (!narration.audio_path) continue;
          if (isUnlocked(narration, child.birthdate)) {
            let audioUrl: string | null = null;
            let imageUrl: string | null = null;

            if (narration.audio_path) {
              const { data } = await supabase.storage
                .from('audio')
                .createSignedUrl(narration.audio_path, 3600);
              audioUrl = data?.signedUrl || null;
            }

            if (narration.image_path) {
              const { data } = await supabase.storage
                .from('images')
                .createSignedUrl(narration.image_path, 3600);
              imageUrl = data?.signedUrl || null;
            }

            items.push({
              id: narration.id,
              type: 'audio',
              title: narration.title,
              audioUrl,
              imageUrl,
              createdAt: narration.created_at,
            });
          } else {
            hasLockedContent = true;
          }
        }

        // Sort by newest first
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Add locked card at end if there are locked items
        if (hasLockedContent) {
          items.push({ id: 'locked', type: 'locked', title: null, createdAt: '' });
        }

        // If no items at all, show empty state
        if (items.length === 0) {
          items.push({ id: 'empty', type: 'empty', title: null, createdAt: '' });
        }

        setFeedItems(items);
      } catch (err) {
        console.error('Error fetching kids content:', err);
        setFeedItems([{ id: 'empty', type: 'empty', title: null, createdAt: '' }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  // Flush love events
  const flushLoves = useCallback(async () => {
    if (!session) return;
    const batch = { ...loveBatchRef.current };
    loveBatchRef.current = {};

    for (const [memoryId, count] of Object.entries(batch)) {
      try {
        // Determine memory type
        const [videoRes, narrRes] = await Promise.all([
          supabase.from('videos').select('id').eq('id', memoryId).maybeSingle(),
          supabase.from('narrations').select('id').eq('id', memoryId).maybeSingle(),
        ]);
        const memoryType = videoRes.data ? 'video' : narrRes.data ? 'narration' : null;
        if (!memoryType) continue;

        await supabase.rpc('increment_love', {
          p_kid_id: session.childId,
          p_memory_id: memoryId,
          p_memory_type: memoryType,
          p_increment: count,
        });
      } catch (err) {
        console.error('Error flushing love:', err);
      }
    }
  }, [session]);

  const handleDoubleTap = useCallback((x: number, y: number, memoryId: string) => {
    // Show heart animation
    const heartId = Date.now();
    setHearts((prev) => [...prev, { id: heartId, x, y }]);

    // Batch love
    loveBatchRef.current[memoryId] = (loveBatchRef.current[memoryId] || 0) + 1;
    if (loveTimerRef.current) clearTimeout(loveTimerRef.current);
    loveTimerRef.current = setTimeout(() => flushLoves(), 750);
  }, [flushLoves]);

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleExit = async () => {
    await AsyncStorage.removeItem(KIDS_SESSION_KEY);
    setShowMenu(false);
    router.replace('/(auth)/sign-in');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" hidden />
        <ActivityIndicator size="large" color="#c4a471" />
        <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 16 }}>
          Loading stories...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" hidden />

      {/* Video Feed */}
      <FlatList
        data={feedItems}
        renderItem={({ item, index }) => (
          <FeedVideoItem
            item={item}
            isActive={index === activeIndex}
            onDoubleTap={handleDoubleTap}
          />
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />

      {/* Heart burst animations */}
      {hearts.map((heart) => (
        <HeartBurst
          key={heart.id}
          x={heart.x}
          y={heart.y}
          onDone={() => removeHeart(heart.id)}
        />
      ))}

      {/* Menu button (top-right) */}
      <TouchableOpacity
        onPress={() => setShowMenu(!showMenu)}
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 50 : 20,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50,
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="white" />
      </TouchableOpacity>

      {/* Menu popover */}
      {showMenu ? (
        <View style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 95 : 65,
          right: 16,
          backgroundColor: '#1f2937',
          borderRadius: 12,
          paddingVertical: 4,
          minWidth: 140,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 50,
        }}>
          <TouchableOpacity
            onPress={handleExit}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600', marginLeft: 10 }}>
              Exit
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Dismiss menu backdrop */}
      {showMenu ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 40,
          }}
        />
      ) : null}
    </View>
  );
}
