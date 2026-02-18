import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Keyboard,
  Alert,
  Dimensions,
  StatusBar,
  PanResponder,
  FlatList,
} from "react-native";
import { Audio, Video } from "expo-av";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoComments } from "hooks/useVideoComments";
import { useAuth } from "hooks/useAuth";
import { useTheme } from "../providers/ThemeProvider";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Comment = {
  id: string | number;
  author: string;
  content: string;
  timestamp: string;
  timeInSeconds: number;
  createdAt: string | Date;
  replies?: Comment[];
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const CommentItem = ({
  comment,
  isReply = false,
  replyTo,
  setReplyTo,
  replyContent,
  setReplyContent,
  handleAddReply,
  seekToTime,
  isDark,
}: {
  comment: Comment;
  isReply?: boolean;
  replyTo: string | number | null;
  setReplyTo: (id: string | number | null) => void;
  replyContent: string;
  setReplyContent: (s: string) => void;
  handleAddReply: (parentCommentId: string | number) => Promise<void> | void;
  seekToTime: (s: number) => void;
  isDark: boolean;
}) => {
  const cardBg = isDark ? 'bg-[#1f2937]' : 'bg-gray-50';
  const primaryText = isDark ? 'text-gray-200' : 'text-gray-700';
  const secondaryText = isDark ? 'text-gray-400' : 'text-gray-500';
  const replyInputClass = isDark
    ? 'border border-gray-600 bg-gray-800 text-gray-100'
    : 'border border-gray-300 bg-white text-gray-900';

  return (
    <View className={`${isReply ? 'ml-4 pl-3' : ''} mb-3`} style={isReply ? { borderLeftWidth: 2, borderLeftColor: isDark ? '#374151' : '#e5e7eb' } : undefined}>
      <View className={`${cardBg} rounded-lg p-3`}>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View
              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? '#374151' : '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="user" size={14} color={isDark ? '#cbd5f5' : '#6B7280'} />
            </View>
            <Text className={`font-medium text-sm ${primaryText}`}>{comment.author}</Text>
            <Pressable onPress={() => seekToTime(comment.timeInSeconds)} className="flex-row items-center gap-1">
              <Feather name="clock" size={11} color="#D4A853" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#D4A853' }}>{comment.timestamp}</Text>
            </Pressable>
          </View>
          <Text className={`text-xs ${secondaryText}`}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text className={`${primaryText} text-sm mb-2`}>{comment.content}</Text>

        {!isReply && (
          <Pressable onPress={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="reply" size={14} color="#D4A853" />
            <Text style={{ fontSize: 12, color: '#D4A853' }}>Reply</Text>
          </Pressable>
        )}
      </View>

      {replyTo === comment.id && (
        <View className="mt-2 ml-2">
          <View className="flex-row gap-2 items-center">
            <TextInput
              value={replyContent}
              onChangeText={setReplyContent}
              placeholder="Write a reply..."
              placeholderTextColor={isDark ? '#94A3B8' : '#6B7280'}
              className={`flex-1 px-3 py-2 rounded-md ${replyInputClass}`}
              returnKeyType="send"
              onSubmitEditing={() => handleAddReply(comment.id)}
            />
            <Pressable onPress={() => handleAddReply(comment.id)} style={{ backgroundColor: '#D4A853', borderRadius: 8, padding: 10 }}>
              <Feather name="send" size={14} color="#1B2838" />
            </Pressable>
          </View>
        </View>
      )}

      {comment.replies?.map((reply) => (
        <View key={reply.id} className="mt-2">
          <CommentItem
            comment={reply}
            isReply
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            handleAddReply={handleAddReply}
            seekToTime={seekToTime}
            isDark={isDark}
          />
        </View>
      ))}
    </View>
  );
};

/* ──────────────────────────────────────────────────────────────
   Single video item inside the vertical feed
   ────────────────────────────────────────────────────────────── */
function FeedVideoItem({
  video,
  videoUrl,
  isActive,
  onRequestClose,
  onShowDetails,
}: {
  video: any;
  videoUrl: string;
  isActive: boolean;
  onRequestClose: () => void;
  onShowDetails: () => void;
}) {
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playIconTimeout = useRef<NodeJS.Timeout | null>(null);
  const { comments } = useVideoComments(video.id);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      // Enable audio on silent mode right before playback
      Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch((e) =>
        console.warn('Audio mode failed:', e)
      );
      videoRef.current.playAsync().catch(() => {});
      setIsPaused(false);
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      setIsPaused(true);
    }
  }, [isActive]);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status?.positionMillis != null) setCurrentTime(Math.floor(status.positionMillis / 1000));
    if (status?.durationMillis != null) setDuration(Math.floor(status.durationMillis / 1000));
  }, []);

  const handleTapToToggle = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
          setIsPaused(true);
        } else {
          await videoRef.current.playAsync();
          setIsPaused(false);
        }
        setShowPlayIcon(true);
        if (playIconTimeout.current) clearTimeout(playIconTimeout.current);
        playIconTimeout.current = setTimeout(() => setShowPlayIcon(false), 600);
      }
    } catch {}
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' }}>
      <Pressable onPress={handleTapToToggle} style={{ flex: 1 }}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          resizeMode="cover"
          shouldPlay={isActive}
          isLooping
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />

        {/* Play/Pause icon overlay */}
        {showPlayIcon && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
            pointerEvents="none"
          >
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={isPaused ? "play" : "pause"} size={36} color="white" style={isPaused ? { marginLeft: 4 } : undefined} />
            </View>
          </View>
        )}

        {/* Top overlay — close + notes */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 56, paddingHorizontal: 20 }} pointerEvents="box-none">
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} pointerEvents="box-none">
            <Pressable
              onPress={onRequestClose}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color="white" />
            </Pressable>

            <Pressable
              onPress={onShowDetails}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', gap: 6 }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="white" />
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                Notes {comments.length > 0 ? `(${comments.length})` : ''}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom overlay — title, date, progress */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="box-none">
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 60 }}>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 4 }} numberOfLines={2}>
              {video.title || "Untitled Story"}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {video.created_at
                ? new Date(video.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : ''}
            </Text>

            {/* Progress bar */}
            <View style={{ marginTop: 12, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
              <View style={{ width: `${Math.min(progress, 100)}%`, height: 3, backgroundColor: '#D4A853', borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{formatTime(currentTime)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{formatTime(duration)}</Text>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   End-of-list card
   ────────────────────────────────────────────────────────────── */
function EndOfListCard({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: isDark ? '#0f172a' : '#F5F3EF', alignItems: 'center', justifyContent: 'center' }}>
      <Pressable onPress={onClose} style={{ position: 'absolute', top: 56, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#1f2937' : '#e8e5e0', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={24} color={isDark ? '#d1d5db' : '#1B2838'} />
      </Pressable>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#1f2937' : '#e8e5e0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Ionicons name="checkmark-circle" size={40} color="#D4A853" />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: isDark ? '#f3f4f6' : '#1B2838', marginBottom: 8 }}>You're all caught up</Text>
      <Text style={{ fontSize: 15, color: isDark ? '#9ca3af' : '#6B7280', textAlign: 'center', paddingHorizontal: 48, lineHeight: 22 }}>
        You've watched all your stories. Record a new one to keep building your legacy.
      </Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main exported component — TikTok-style vertical video feed
   ────────────────────────────────────────────────────────────── */
export default function EnhancedVideoPlayer({
  selectedVideo,
  videoUrl,
  onClose,
  visible = true,
  allVideos = [],
  allVideoUrls = {},
}: {
  selectedVideo: { id: string | number; title?: string; notes?: string; created_at?: string };
  videoUrl: string;
  onClose: () => void;
  visible?: boolean;
  allVideos?: any[];
  allVideoUrls?: Record<string, string>;
}) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  // Build feed data — if allVideos provided, use them; otherwise just the single video
  const feedVideos = allVideos.length > 0 ? allVideos : [selectedVideo];
  const feedUrls: Record<string, string> = allVideos.length > 0
    ? allVideoUrls
    : { [String(selectedVideo.id)]: videoUrl };

  // Find the initial index of the selected video in the feed
  const initialIndex = Math.max(0, feedVideos.findIndex((v: any) => v.id === selectedVideo.id));

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [showDetails, setShowDetails] = useState(false);
  const [panelOffset, setPanelOffset] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const activeVideo = feedVideos[activeIndex] || selectedVideo;
  const { comments, addComment, addReply } = useVideoComments(activeVideo.id);

  const PANEL_HEIGHT = SCREEN_HEIGHT * 0.65;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) setPanelOffset(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.5) { setShowDetails(false); setPanelOffset(0); }
        else setPanelOffset(0);
      },
    })
  ).current;

  const panelBg = isDark ? '#0f172a' : '#ffffff';
  const panelBorder = isDark ? '#374151' : '#e8e5e0';
  const inputBg = isDark ? 'bg-gray-800 text-gray-100 border border-gray-600' : 'bg-white text-gray-900 border border-gray-300';
  const titleColor = isDark ? '#f3f4f6' : '#1B2838';
  const subtitleColor = isDark ? '#9ca3af' : '#6B7280';
  const emptyBg = isDark ? '#111827' : '#f5f3ef';

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    Keyboard.dismiss();
    try {
      await addComment({
        content: newComment,
        author: "Dad",
        author_id: user?.id,
        timestamp: "0:00",
        timeInSeconds: 0,
      });
      setNewComment("");
    } catch (err: any) {
      Alert.alert("Error", "Failed to add comment: " + (err?.message || "Unknown error"));
    }
  };

  const handleAddReply = async (parentCommentId: string | number) => {
    if (!replyContent.trim()) return;
    Keyboard.dismiss();
    try {
      await addReply(parentCommentId, {
        content: replyContent,
        author: "Dad",
        author_id: user?.id,
        timestamp: "0:00",
        timeInSeconds: 0,
      });
      setReplyContent("");
      setReplyTo(null);
    } catch (err: any) {
      Alert.alert("Error", "Failed to add reply: " + (err?.message || "Unknown error"));
    }
  };

  const seekToTime = async (_timeInSeconds: number) => {
    // No-op in feed mode (individual video refs are inside FeedVideoItem)
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (idx != null) setActiveIndex(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  // Build data for the FlatList: videos + end card
  const feedData = [...feedVideos.map((v: any, i: number) => ({ ...v, _feedType: 'video', _index: i })), { _feedType: 'end', id: 'end-card' }];

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={feedData}
          keyExtractor={(item: any) => String(item.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }: { item: any; index: number }) => {
            if (item._feedType === 'end') {
              return <EndOfListCard onClose={onClose} isDark={isDark} />;
            }

            const url = feedUrls[String(item.id)] || videoUrl;
            return (
              <FeedVideoItem
                video={item}
                videoUrl={url}
                isActive={index === activeIndex}
                onRequestClose={onClose}
                onShowDetails={() => setShowDetails(true)}
              />
            );
          }}
        />

        {/* Details Panel (slides up from bottom) */}
        {showDetails && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
            <Pressable
              onPress={() => { setShowDetails(false); setPanelOffset(0); }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
            />

            <View
              {...panResponder.panHandlers}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: PANEL_HEIGHT,
                backgroundColor: panelBg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
                transform: [{ translateY: panelOffset }],
              }}
            >
              {/* Drag handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#374151' : '#d1d5db' }} />
              </View>

              {/* Panel header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: panelBorder,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: titleColor }} numberOfLines={1}>
                    {activeVideo.title || "Untitled Story"}
                  </Text>
                  <Text style={{ fontSize: 13, color: subtitleColor, marginTop: 2 }}>
                    Notes ({comments.length})
                  </Text>
                </View>
                <Pressable
                  onPress={() => { setShowDetails(false); setPanelOffset(0); }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#1f2937' : '#f5f3ef', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={18} color={isDark ? '#d1d5db' : '#1B2838'} />
                </Pressable>
              </View>

              {/* Comment input */}
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: panelBorder }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a note..."
                    className={`flex-1 px-3 py-3 rounded-lg ${inputBg}`}
                    returnKeyType="send"
                    onSubmitEditing={handleAddComment}
                    placeholderTextColor={isDark ? '#94A3B8' : '#6B7280'}
                  />
                  <Pressable onPress={handleAddComment} style={{ backgroundColor: '#D4A853', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 }}>
                    <Feather name="send" size={16} color="#1B2838" />
                  </Pressable>
                </View>
              </View>

              {/* Comments list */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {comments.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: emptyBg, borderRadius: 12 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? '#1f2937' : '#e8e5e0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Ionicons name="chatbox-outline" color={isDark ? '#94A3B8' : '#9ca3af'} size={24} />
                    </View>
                    <Text style={{ color: subtitleColor, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 }}>
                      No notes yet. Add the first one!
                    </Text>
                  </View>
                ) : (
                  <View>
                    {comments.map((c: Comment) => (
                      <CommentItem
                        key={c.id}
                        comment={c}
                        replyTo={replyTo}
                        setReplyTo={setReplyTo}
                        replyContent={replyContent}
                        setReplyContent={setReplyContent}
                        handleAddReply={handleAddReply}
                        seekToTime={seekToTime}
                        isDark={isDark}
                      />
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
