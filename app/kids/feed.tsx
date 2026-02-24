import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
  TextInput,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Audio, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from 'utils/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const KIDS_SESSION_KEY = 'kids_session';
const SAFE_TOP = Platform.OS === 'ios' ? 54 : 24;

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

type FilterType = 'all' | 'videos' | 'audio';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function relativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay > 30) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

// ── HeartBurst ───────────────────────────────────────────────────────────────

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
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    zIndex: 100,
    pointerEvents: 'none' as const,
  }));

  return (
    <Animated.View style={animStyle}>
      <Text style={{ fontSize: 50 }}>{'\u2764\uFE0F'}</Text>
    </Animated.View>
  );
}

// ── PlayPauseOverlay ─────────────────────────────────────────────────────────

function PlayPauseOverlay({ visible, icon }: { visible: boolean; icon?: string }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(0.7, { duration: 100 }),
        withTiming(0, { duration: 500 }),
      );
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[style, {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none',
      }]}
    >
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={(icon || 'play') as any} size={40} color="white" />
      </View>
    </Animated.View>
  );
}

// ── AudioPulse — pulsing rings for audio stories ─────────────────────────────

function AudioPulse({ isPlaying }: { isPlaying: boolean }) {
  const scale1 = useSharedValue(1);
  const opacity1 = useSharedValue(0.5);
  const scale2 = useSharedValue(1);
  const opacity2 = useSharedValue(0.3);

  useEffect(() => {
    if (isPlaying) {
      scale1.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.in(Easing.ease) }),
        ), -1, false,
      );
      opacity1.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 1200 }),
          withTiming(0.5, { duration: 1200 }),
        ), -1, false,
      );
      scale2.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.in(Easing.ease) }),
        ), -1, false,
      );
      opacity2.value = withRepeat(
        withSequence(
          withTiming(0.05, { duration: 1500 }),
          withTiming(0.3, { duration: 1500 }),
        ), -1, false,
      );
    } else {
      scale1.value = withTiming(1, { duration: 300 });
      opacity1.value = withTiming(0.5, { duration: 300 });
      scale2.value = withTiming(1, { duration: 300 });
      opacity2.value = withTiming(0.3, { duration: 300 });
    }
  }, [isPlaying]);

  const ring1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));
  const ring2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  return (
    <View style={{
      position: 'absolute', top: SCREEN_HEIGHT * 0.32, left: 0, right: 0,
      alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
    }}>
      <Animated.View style={[ring2, {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        borderWidth: 1.5, borderColor: 'rgba(196,164,113,0.4)',
      }]} />
      <Animated.View style={[ring1, {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        borderWidth: 2, borderColor: 'rgba(196,164,113,0.6)',
      }]} />
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(196,164,113,0.25)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name="musical-notes" size={36} color="#c4a471" />
      </View>
    </View>
  );
}

// ── ActionRail — right-side vertical action buttons ──────────────────────────

function ActionRail({
  isLiked, isBookmarked, loveCount, noteCount,
  onLike, onBookmark, onOpenNotes, onMenuPress,
}: {
  isLiked: boolean;
  isBookmarked: boolean;
  loveCount: number;
  noteCount: number;
  onLike: () => void;
  onBookmark: () => void;
  onOpenNotes: () => void;
  onMenuPress: () => void;
}) {
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  const handleLike = () => {
    likeScale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withTiming(1, { duration: 150 }),
    );
    onLike();
  };

  const handleBookmark = () => {
    bookmarkScale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withTiming(1, { duration: 150 }),
    );
    onBookmark();
  };

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  const bookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const iconShadow = {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  return (
    <View style={{
      position: 'absolute', right: 12, bottom: SCREEN_HEIGHT * 0.18,
      alignItems: 'center', zIndex: 20,
    }}>
      {/* Heart / Like */}
      <Animated.View style={likeStyle}>
        <TouchableOpacity
          onPress={handleLike}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ alignItems: 'center', marginBottom: 20 }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={isLiked ? '#ef4444' : 'white'}
            style={iconShadow}
          />
          {loveCount > 0 ? (
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginTop: 2, ...iconShadow }}>
              {loveCount}
            </Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>

      {/* Bookmark / Save */}
      <Animated.View style={bookmarkStyle}>
        <TouchableOpacity
          onPress={handleBookmark}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ alignItems: 'center', marginBottom: 20 }}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={30}
            color={isBookmarked ? '#c4a471' : 'white'}
            style={iconShadow}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Notes / Journal */}
      <TouchableOpacity
        onPress={onOpenNotes}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ alignItems: 'center', marginBottom: 20 }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" style={iconShadow} />
        {noteCount > 0 ? (
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginTop: 2, ...iconShadow }}>
            {noteCount}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* Three-dot menu */}
      <TouchableOpacity
        onPress={onMenuPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ alignItems: 'center' }}
      >
        <Ionicons name="ellipsis-horizontal" size={26} color="white" style={iconShadow} />
      </TouchableOpacity>
    </View>
  );
}

// ── BottomInfo — enhanced bottom overlay with dad info, title, badge, date ───

function BottomInfo({
  item,
  parentName,
}: {
  item: FeedItem;
  parentName: string;
}) {
  if (item.type === 'locked' || item.type === 'empty') return null;

  const isAudio = item.type === 'audio';

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 60 }}
      >
        {/* Dad's name row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'rgba(196,164,113,0.3)',
            justifyContent: 'center', alignItems: 'center', marginRight: 8,
            borderWidth: 1.5, borderColor: '#c4a471',
          }}>
            <Ionicons name="person" size={16} color="#c4a471" />
          </View>
          <Text style={{
            color: 'white', fontSize: 14, fontWeight: '600',
            textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}>
            {parentName}
          </Text>
        </View>

        {/* Title */}
        {item.title ? (
          <Text style={{
            color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 8,
            textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}>
            {item.title}
          </Text>
        ) : null}

        {/* Type badge + date row */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12,
            paddingHorizontal: 10, paddingVertical: 4, marginRight: 10,
          }}>
            <Text style={{ fontSize: 12 }}>{isAudio ? '\uD83C\uDFA7' : '\uD83C\uDFAC'}</Text>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '600', marginLeft: 4 }}>
              {isAudio ? 'Audio Story' : 'Video'}
            </Text>
          </View>
          {item.createdAt ? (
            <Text style={{
              color: 'rgba(255,255,255,0.7)', fontSize: 12,
              textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}>
              {relativeTime(item.createdAt)}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

// ── NotesBottomSheet — slide-up panel for kid notes ──────────────────────────

function NotesBottomSheet({
  visible,
  notes,
  noteText,
  onChangeText,
  onSave,
  onClose,
  loading,
}: {
  visible: boolean;
  notes: { id: string; note_text: string; created_at: string }[];
  noteText: string;
  onChangeText: (t: string) => void;
  onSave: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : SCREEN_HEIGHT, { duration: 300 });
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
    }}>
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      />

      {/* Sheet */}
      <Animated.View style={[sheetStyle, {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: SCREEN_HEIGHT * 0.55,
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
      }]}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </View>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
        }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>My Notes</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Notes list */}
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {notes.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Ionicons name="chatbubble-outline" size={36} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
                No notes yet. Write what you think about this story!
              </Text>
            </View>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 12, padding: 14, marginBottom: 10,
                borderLeftWidth: 3, borderLeftColor: '#c4a471',
              }}>
                <Text style={{ color: 'white', fontSize: 14, lineHeight: 20 }}>{note.note_text}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6 }}>
                  {relativeTime(note.created_at)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Input area */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 10,
          borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
          paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        }}>
          <TextInput
            value={noteText}
            onChangeText={onChangeText}
            placeholder="What did you think about this story?"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            style={{
              flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
              color: 'white', fontSize: 14, maxHeight: 80,
            }}
          />
          <TouchableOpacity
            onPress={onSave}
            disabled={!noteText.trim() || loading}
            style={{
              marginLeft: 10, width: 40, height: 40, borderRadius: 20,
              backgroundColor: noteText.trim() ? '#c4a471' : 'rgba(255,255,255,0.15)',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ── FilterTabs — top horizontal filter bar ───────────────────────────────────

function FilterTabs({
  active,
  onChange,
}: {
  active: FilterType;
  onChange: (f: FilterType) => void;
}) {
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'videos', label: 'Videos' },
    { key: 'audio', label: 'Audio Stories' },
  ];

  return (
    <View style={{
      position: 'absolute', top: SAFE_TOP, left: 0, right: 0, zIndex: 30,
    }}>
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={{ paddingHorizontal: 60, paddingTop: 4, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {filters.map((f) => {
            const isActive = active === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => onChange(f.key)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginHorizontal: 14, paddingBottom: 4 }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 15,
                  fontWeight: isActive ? '700' : '400',
                  opacity: isActive ? 1 : 0.7,
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}>
                  {f.label}
                </Text>
                {isActive ? (
                  <View style={{
                    height: 2.5, backgroundColor: 'white', borderRadius: 1.5,
                    marginTop: 4, alignSelf: 'center', width: '80%',
                  }} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

// ── FeedVideoItem — single feed item renderer ────────────────────────────────

function FeedVideoItem({
  item,
  isActive,
  onDoubleTap,
  isLiked,
  isBookmarked,
  loveCount,
  noteCount,
  onLike,
  onBookmark,
  onOpenNotes,
  onMenuPress,
  parentName,
}: {
  item: FeedItem;
  isActive: boolean;
  onDoubleTap: (x: number, y: number, memoryId: string) => void;
  isLiked: boolean;
  isBookmarked: boolean;
  loveCount: number;
  noteCount: number;
  onLike: () => void;
  onBookmark: () => void;
  onOpenNotes: () => void;
  onMenuPress: () => void;
  parentName: string;
}) {
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const [pauseIcon, setPauseIcon] = useState('play');
  const lastTapRef = useRef(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Video play/pause
  useEffect(() => {
    if (item.type !== 'video' || !videoRef.current) return;
    if (isActive && !isPaused) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive, item.type, isPaused]);

  // Audio loading & playback
  useEffect(() => {
    if (item.type !== 'audio' || !item.audioUrl) return;

    let mounted = true;

    const setup = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
        const { sound } = await Audio.Sound.createAsync(
          { uri: item.audioUrl! },
          { isLooping: true, shouldPlay: false },
          (status: any) => {
            if (!mounted) return;
            if (status.isLoaded) {
              setAudioProgress(status.positionMillis || 0);
              setAudioDuration(status.durationMillis || 0);
              setIsAudioPlaying(status.isPlaying || false);
            }
          },
        );
        if (!mounted) { sound.unloadAsync(); return; }
        soundRef.current = sound;
      } catch (e) {
        console.error('Error loading audio:', e);
      }
    };

    setup();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [item.audioUrl]);

  // Audio play/pause based on active state
  useEffect(() => {
    if (item.type !== 'audio' || !soundRef.current) return;
    if (isActive && !isPaused) {
      soundRef.current.playAsync().catch(() => {});
    } else {
      soundRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive, isPaused, item.type]);

  const handleTap = (evt: any) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      const { locationX, locationY } = evt.nativeEvent;
      onDoubleTap(locationX, locationY, item.id);
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;

    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY - 50) {
        if (item.type === 'video' && videoRef.current) {
          if (isPaused) {
            videoRef.current.playAsync().catch(() => {});
            setIsPaused(false);
            setPauseIcon('play');
          } else {
            videoRef.current.pauseAsync().catch(() => {});
            setIsPaused(true);
            setPauseIcon('pause');
          }
          setShowPauseOverlay(true);
          setTimeout(() => setShowPauseOverlay(false), 100);
        } else if (item.type === 'audio' && soundRef.current) {
          if (isPaused || !isAudioPlaying) {
            soundRef.current.playAsync().catch(() => {});
            setIsPaused(false);
            setPauseIcon('play');
          } else {
            soundRef.current.pauseAsync().catch(() => {});
            setIsPaused(true);
            setPauseIcon('pause');
          }
          setShowPauseOverlay(true);
          setTimeout(() => setShowPauseOverlay(false), 100);
        }
      }
    }, DOUBLE_TAP_DELAY);
  };

  // ── Locked state ──
  if (item.type === 'locked') {
    return (
      <View style={{
        width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
        backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.1)',
          justifyContent: 'center', alignItems: 'center', marginBottom: 20,
        }}>
          <Ionicons name="lock-closed" size={36} color="#c4a471" />
        </View>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 8 }}>
          More stories are coming!
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 16 }}>{'\u{1F382}'}</Text>
      </View>
    );
  }

  // ── Empty state ──
  if (item.type === 'empty') {
    return (
      <View style={{
        width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
        backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
      }}>
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

  // ── Audio type ──
  if (item.type === 'audio') {
    const progressPct = audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#0f172a' }}
      >
        {/* Background image or gradient */}
        {item.imageUrl ? (
          <>
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'absolute' }}
              resizeMode="cover"
            />
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }} />
          </>
        ) : (
          <LinearGradient
            colors={['#1a2332', '#0f172a', '#1a2332']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}

        {/* Pulsing audio visualization */}
        <AudioPulse isPlaying={isAudioPlaying && isActive} />

        {/* Centered title for audio without image */}
        {!item.imageUrl && item.title ? (
          <View style={{
            position: 'absolute', top: SCREEN_HEIGHT * 0.52, left: 0, right: 0,
            alignItems: 'center', paddingHorizontal: 40,
          }}>
            <Text style={{
              color: 'white', fontSize: 22, fontWeight: '700', textAlign: 'center',
              textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}>
              {item.title}
            </Text>
          </View>
        ) : null}

        <PlayPauseOverlay visible={showPauseOverlay} icon={pauseIcon} />

        {/* Audio progress bar */}
        <View style={{
          position: 'absolute', bottom: 130, left: 16, right: 60,
          height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1.5,
        }}>
          <View style={{
            height: 3, backgroundColor: '#c4a471', borderRadius: 1.5,
            width: `${Math.min(progressPct, 100)}%`,
          }} />
        </View>

        {/* Action rail */}
        <ActionRail
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          loveCount={loveCount}
          noteCount={noteCount}
          onLike={onLike}
          onBookmark={onBookmark}
          onOpenNotes={onOpenNotes}
          onMenuPress={onMenuPress}
        />

        {/* Bottom info */}
        <BottomInfo item={item} parentName={parentName} />
      </TouchableOpacity>
    );
  }

  // ── Video type ──
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
          shouldPlay={isActive && !isPaused}
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

      <PlayPauseOverlay visible={showPauseOverlay} icon={pauseIcon} />

      {/* Top gradient for readability */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent']}
          style={{ flex: 1 }}
        />
      </View>

      {/* Action rail */}
      <ActionRail
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        loveCount={loveCount}
        noteCount={noteCount}
        onLike={onLike}
        onBookmark={onBookmark}
        onOpenNotes={onOpenNotes}
        onMenuPress={onMenuPress}
      />

      {/* Bottom info */}
      <BottomInfo item={item} parentName={parentName} />
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function KidsFeedScreen() {
  const [session, setSession] = useState<KidSession | null>(null);
  const [allFeedItems, setAllFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [parentName, setParentName] = useState('Dad');
  const router = useRouter();
  const loveBatchRef = useRef<Record<string, number>>({});
  const loveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Likes, bookmarks, notes state
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [loveCounts, setLoveCounts] = useState<Record<string, number>>({});

  // Notes bottom sheet state
  const [showNotes, setShowNotes] = useState(false);
  const [notesItemId, setNotesItemId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState<{ id: string; note_text: string; created_at: string }[]>([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ── Filtered feed items ──
  const feedItems = useMemo(() => {
    if (activeFilter === 'all') return allFeedItems;
    const typeFilter = activeFilter === 'videos' ? 'video' : 'audio';
    const filtered = allFeedItems.filter(
      (item) => item.type === typeFilter || item.type === 'locked' || item.type === 'empty',
    );
    // If filtering removes all real content, show empty
    const hasContent = filtered.some((i) => i.type === typeFilter);
    if (!hasContent) {
      return [{ id: 'empty', type: 'empty' as const, title: null, createdAt: '' }];
    }
    return filtered;
  }, [allFeedItems, activeFilter]);

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeFilter]);

  // ── Load kid session ──
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KIDS_SESSION_KEY);
        if (!raw) { router.replace('/kids/code-entry'); return; }
        const parsed: KidSession = JSON.parse(raw);
        setSession(parsed);
      } catch {
        router.replace('/kids/code-entry');
      }
    })();
  }, []);

  // ── Fetch parent name ──
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_parent_display_name', {
          p_parent_id: session.parentId,
        });
        if (data) setParentName(data);
      } catch {
        // Fallback to "Dad" — RPC may not exist yet
      }
    })();
  }, [session]);

  // ── Load bookmarks from Supabase ──
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_kid_bookmarks', {
          p_child_id: session.childId,
        });
        if (data && Array.isArray(data)) {
          setBookmarkedItems(new Set(data.map((r: any) => r.memory_id)));
        }
      } catch {
        // RPC may not exist yet — bookmarks just won't load
      }
    })();
  }, [session]);

  // ── Fetch content via RPC ──
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        setLoading(true);

        const { data: content, error: rpcError } = await supabase.rpc('get_kid_feed_content', {
          p_child_id: session.childId,
        });

        if (rpcError) {
          console.error('Error fetching kids content via RPC:', rpcError);
          setAllFeedItems([{ id: 'empty', type: 'empty', title: null, createdAt: '' }]);
          setLoading(false);
          return;
        }

        const records = content || [];
        const items: FeedItem[] = [];
        let hasLockedContent = false;

        for (const record of records) {
          if (isUnlocked(record, session.birthdate)) {
            if (record.content_type === 'video') {
              let videoUrl: string | null = null;
              let thumbnailUrl: string | null = null;

              if (record.file_path) {
                const { data } = await supabase.storage
                  .from('videos').createSignedUrl(record.file_path, 3600);
                videoUrl = data?.signedUrl || null;
              }
              if (record.thumbnail_path) {
                const { data } = await supabase.storage
                  .from('videos').createSignedUrl(record.thumbnail_path, 3600);
                thumbnailUrl = data?.signedUrl || null;
              }

              items.push({
                id: record.id, type: 'video', title: record.title,
                videoUrl, thumbnailUrl, createdAt: record.created_at,
              });
            } else if (record.content_type === 'audio') {
              if (!record.audio_path) continue;
              let audioUrl: string | null = null;
              let imageUrl: string | null = null;

              if (record.audio_path) {
                const { data } = await supabase.storage
                  .from('audio').createSignedUrl(record.audio_path, 3600);
                audioUrl = data?.signedUrl || null;
              }
              if (record.image_path) {
                const { data } = await supabase.storage
                  .from('images').createSignedUrl(record.image_path, 3600);
                imageUrl = data?.signedUrl || null;
              }

              items.push({
                id: record.id, type: 'audio', title: record.title,
                audioUrl, imageUrl, createdAt: record.created_at,
              });
            }
          } else {
            hasLockedContent = true;
          }
        }

        if (hasLockedContent) {
          items.push({ id: 'locked', type: 'locked', title: null, createdAt: '' });
        }
        if (items.length === 0) {
          items.push({ id: 'empty', type: 'empty', title: null, createdAt: '' });
        }

        setAllFeedItems(items);

        // Load note counts for all items
        const realItems = items.filter((i) => i.type === 'video' || i.type === 'audio');
        const counts: Record<string, number> = {};
        for (const item of realItems) {
          try {
            const { data } = await supabase.rpc('get_kid_notes', {
              p_child_id: session.childId,
              p_memory_id: item.id,
            });
            counts[item.id] = Array.isArray(data) ? data.length : 0;
          } catch {
            counts[item.id] = 0;
          }
        }
        setNoteCounts(counts);
      } catch (err) {
        console.error('Error fetching kids content:', err);
        setAllFeedItems([{ id: 'empty', type: 'empty', title: null, createdAt: '' }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  // ── Love batching ──
  const flushLoves = useCallback(async () => {
    if (!session) return;
    const batch = { ...loveBatchRef.current };
    loveBatchRef.current = {};

    for (const [memoryId, count] of Object.entries(batch)) {
      try {
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
    const heartId = Date.now();
    setHearts((prev) => [...prev, { id: heartId, x, y }]);

    // Mark as liked
    setLikedItems((prev) => new Set(prev).add(memoryId));
    setLoveCounts((prev) => ({ ...prev, [memoryId]: (prev[memoryId] || 0) + 1 }));

    // Batch love
    loveBatchRef.current[memoryId] = (loveBatchRef.current[memoryId] || 0) + 1;
    if (loveTimerRef.current) clearTimeout(loveTimerRef.current);
    loveTimerRef.current = setTimeout(() => flushLoves(), 750);
  }, [flushLoves]);

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── Like via action rail ──
  const handleLikeItem = useCallback((memoryId: string) => {
    setLikedItems((prev) => {
      const next = new Set(prev);
      if (next.has(memoryId)) {
        next.delete(memoryId);
        return next;
      }
      next.add(memoryId);
      return next;
    });
    setLoveCounts((prev) => ({ ...prev, [memoryId]: (prev[memoryId] || 0) + 1 }));

    // Send love event
    loveBatchRef.current[memoryId] = (loveBatchRef.current[memoryId] || 0) + 1;
    if (loveTimerRef.current) clearTimeout(loveTimerRef.current);
    loveTimerRef.current = setTimeout(() => flushLoves(), 750);
  }, [flushLoves]);

  // ── Bookmark toggle ──
  const handleBookmarkItem = useCallback(async (memoryId: string) => {
    if (!session) return;
    setBookmarkedItems((prev) => {
      const next = new Set(prev);
      if (next.has(memoryId)) {
        next.delete(memoryId);
        // Remove from Supabase
        supabase.rpc('remove_kid_bookmark', {
          p_child_id: session.childId,
          p_memory_id: memoryId,
        }).catch(() => {});
        return next;
      }
      next.add(memoryId);
      // Save to Supabase
      supabase.rpc('save_kid_bookmark', {
        p_child_id: session.childId,
        p_memory_id: memoryId,
      }).catch(() => {});
      return next;
    });
  }, [session]);

  // ── Notes ──
  const openNotes = useCallback(async (memoryId: string) => {
    if (!session) return;
    setNotesItemId(memoryId);
    setShowNotes(true);
    setNoteText('');
    setCurrentNotes([]);

    try {
      const { data } = await supabase.rpc('get_kid_notes', {
        p_child_id: session.childId,
        p_memory_id: memoryId,
      });
      if (data && Array.isArray(data)) {
        setCurrentNotes(data);
      }
    } catch {
      // RPC may not exist yet
    }
  }, [session]);

  const saveNote = useCallback(async () => {
    if (!session || !notesItemId || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await supabase.rpc('save_kid_note', {
        p_child_id: session.childId,
        p_memory_id: notesItemId,
        p_note_text: noteText.trim(),
      });
      // Refresh notes
      const { data } = await supabase.rpc('get_kid_notes', {
        p_child_id: session.childId,
        p_memory_id: notesItemId,
      });
      if (data && Array.isArray(data)) {
        setCurrentNotes(data);
        setNoteCounts((prev) => ({ ...prev, [notesItemId]: data.length }));
      }
      setNoteText('');
      Keyboard.dismiss();
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  }, [session, notesItemId, noteText]);

  const closeNotes = useCallback(() => {
    setShowNotes(false);
    setNotesItemId(null);
    Keyboard.dismiss();
  }, []);

  // ── Exit ──
  const handleExit = async () => {
    await AsyncStorage.removeItem(KIDS_SESSION_KEY);
    setShowMenu(false);
    router.replace('/(auth)/sign-in');
  };

  // ── Viewability tracking ──
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  // ── Loading state ──
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" hidden />
        <ActivityIndicator size="large" color="#c4a471" />
        <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 16 }}>Loading stories...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" hidden />

      {/* Video Feed */}
      <FlatList
        ref={flatListRef}
        data={feedItems}
        renderItem={({ item, index }) => (
          <FeedVideoItem
            item={item}
            isActive={index === activeIndex}
            onDoubleTap={handleDoubleTap}
            isLiked={likedItems.has(item.id)}
            isBookmarked={bookmarkedItems.has(item.id)}
            loveCount={loveCounts[item.id] || 0}
            noteCount={noteCounts[item.id] || 0}
            onLike={() => handleLikeItem(item.id)}
            onBookmark={() => handleBookmarkItem(item.id)}
            onOpenNotes={() => openNotes(item.id)}
            onMenuPress={() => setShowMenu(true)}
            parentName={parentName}
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

      {/* Close button (top-left) */}
      <TouchableOpacity
        onPress={handleExit}
        style={{
          position: 'absolute', top: SAFE_TOP, left: 16,
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center', alignItems: 'center', zIndex: 50,
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={22} color="white" />
      </TouchableOpacity>

      {/* Filter tabs (top-center) */}
      <FilterTabs active={activeFilter} onChange={setActiveFilter} />

      {/* Exit menu popover (triggered from action rail) */}
      {showMenu ? (
        <>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 140,
            }}
          />
          <View style={{
            position: 'absolute',
            bottom: SCREEN_HEIGHT * 0.15,
            right: 16,
            backgroundColor: '#1f2937',
            borderRadius: 12, paddingVertical: 4, minWidth: 140,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 150,
          }}>
            <TouchableOpacity
              onPress={handleExit}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 12,
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600', marginLeft: 10 }}>
                Exit
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* Notes bottom sheet */}
      <NotesBottomSheet
        visible={showNotes}
        notes={currentNotes}
        noteText={noteText}
        onChangeText={setNoteText}
        onSave={saveNote}
        onClose={closeNotes}
        loading={savingNote}
      />
    </View>
  );
}
