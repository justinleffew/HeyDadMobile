import { useRef, useState, useCallback } from "react";
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
} from "react-native";
import { Video } from "expo-av";
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

export default function EnhancedVideoPlayer({
  selectedVideo,
  videoUrl,
  onClose,
  visible = true,
}: {
  selectedVideo: { id: string | number; title?: string; notes?: string; created_at?: string };
  videoUrl: string;
  onClose: () => void;
  visible?: boolean;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [panelOffset, setPanelOffset] = useState(0);

  const { user } = useAuth();
  const { comments, addComment, addReply } = useVideoComments(selectedVideo.id);
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const videoRef = useRef<Video>(null);
  const playIconTimeout = useRef<NodeJS.Timeout | null>(null);

  const PANEL_HEIGHT = SCREEN_HEIGHT * 0.65;

  // PanResponder for swipe-down to close details panel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          setPanelOffset(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          setShowDetails(false);
          setPanelOffset(0);
        } else {
          setPanelOffset(0);
        }
      },
    })
  ).current;

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status?.positionMillis != null) {
      setCurrentTime(Math.floor(status.positionMillis / 1000));
    }
    if (status?.durationMillis != null) {
      setDuration(Math.floor(status.durationMillis / 1000));
    }
  }, []);

  const getCurrentTimestamp = () => Math.floor(currentTime);

  const seekToTime = async (timeInSeconds: number) => {
    if (videoRef.current) {
      try {
        await videoRef.current.setPositionAsync(timeInSeconds * 1000);
      } catch {}
    }
  };

  const handleTapToToggle = useCallback(async () => {
    if (!videoRef.current) return;
    try {
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    Keyboard.dismiss();
    try {
      const ts = getCurrentTimestamp();
      await addComment({
        content: newComment,
        author: "Dad",
        author_id: user?.id,
        timestamp: formatTime(ts),
        timeInSeconds: ts,
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
      const ts = getCurrentTimestamp();
      await addReply(parentCommentId, {
        content: replyContent,
        author: "Dad",
        author_id: user?.id,
        timestamp: formatTime(ts),
        timeInSeconds: ts,
      });
      setReplyContent("");
      setReplyTo(null);
    } catch (err: any) {
      Alert.alert("Error", "Failed to add reply: " + (err?.message || "Unknown error"));
    }
  };

  const panelBg = isDark ? '#0f172a' : '#ffffff';
  const panelBorder = isDark ? '#374151' : '#e8e5e0';
  const inputBg = isDark ? 'bg-gray-800 text-gray-100 border border-gray-600' : 'bg-white text-gray-900 border border-gray-300';
  const titleColor = isDark ? '#f3f4f6' : '#1B2838';
  const subtitleColor = isDark ? '#9ca3af' : '#6B7280';
  const emptyBg = isDark ? '#111827' : '#f5f3ef';

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Fullscreen Video */}
        <Pressable
          onPress={handleTapToToggle}
          style={{ flex: 1, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            resizeMode="cover"
            shouldPlay
            isLooping
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />

          {/* Play/Pause icon overlay */}
          {showPlayIcon && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              pointerEvents="none"
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={isPaused ? "play" : "pause"}
                  size={36}
                  color="white"
                  style={isPaused ? { marginLeft: 4 } : undefined}
                />
              </View>
            </View>
          )}

          {/* Top overlay — close button + notes button */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingTop: 56,
              paddingHorizontal: 20,
            }}
            pointerEvents="box-none"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent']}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 120,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} pointerEvents="box-none">
              <Pressable
                onPress={() => onClose?.()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={24} color="white" />
              </Pressable>

              <Pressable
                onPress={() => setShowDetails(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  gap: 6,
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color="white" />
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                  Notes {comments.length > 0 ? `(${comments.length})` : ''}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom overlay — title, date, progress */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            }}
            pointerEvents="box-none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{
                paddingHorizontal: 20,
                paddingBottom: 48,
                paddingTop: 60,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 22,
                  fontWeight: '700',
                  marginBottom: 4,
                }}
                numberOfLines={2}
              >
                {selectedVideo.title || "Untitled Story"}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                {selectedVideo.created_at
                  ? new Date(selectedVideo.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
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

        {/* Details Panel (slides up from bottom) */}
        {showDetails && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
            {/* Backdrop */}
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
                    {selectedVideo.title || "Untitled Story"}
                  </Text>
                  <Text style={{ fontSize: 13, color: subtitleColor, marginTop: 2 }}>
                    Notes ({comments.length})
                  </Text>
                </View>
                <Pressable
                  onPress={() => { setShowDetails(false); setPanelOffset(0); }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDark ? '#1f2937' : '#f5f3ef',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={18} color={isDark ? '#d1d5db' : '#1B2838'} />
                </Pressable>
              </View>

              {/* Comment input */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: panelBorder,
                }}
              >
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
                  <Pressable
                    onPress={handleAddComment}
                    style={{
                      backgroundColor: '#D4A853',
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Feather name="send" size={16} color="#1B2838" />
                  </Pressable>
                </View>
                <Text style={{ fontSize: 12, color: subtitleColor, marginTop: 6, fontWeight: '500' }}>
                  Timestamped at {formatTime(getCurrentTimestamp())}
                </Text>
              </View>

              {/* Comments list */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {comments.length === 0 ? (
                  <View
                    style={{
                      paddingVertical: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: emptyBg,
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: isDark ? '#1f2937' : '#e8e5e0',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
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
