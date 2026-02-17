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
} from "react-native";
import { Video } from "expo-av";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVideoComments } from "hooks/useVideoComments";
import { useAuth } from "hooks/useAuth";
import { useTheme } from "../providers/ThemeProvider";

type Comment = {
  id: string | number;
  author: string;
  content: string;
  timestamp: string
  timeInSeconds: number
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
  const indentClass = isReply
    ? `ml-4 md:ml-8 border-l-2 ${isDark ? 'border-gray-700' : 'border-gray-200'} pl-2 md:pl-4`
    : '';
  const cardBackground = isDark ? 'bg-[#1f2937]' : 'bg-gray-50';
  const avatarBackground = isDark ? 'bg-gray-700' : 'bg-gray-200';
  const avatarIconColor = isDark ? '#cbd5f5' : '#6B7280';
  const primaryText = isDark ? 'text-gray-200' : 'text-gray-700';
  const secondaryText = isDark ? 'text-gray-400' : 'text-gray-500';
  const replyInputClass = isDark ? 'border border-gray-600 bg-gray-800 text-gray-100' : 'border border-gray-300 bg-white text-gray-900';

  return (
    <View className={`${indentClass} mb-3 md:mb-4`}>
      <View className={`${cardBackground} rounded-lg p-2 md:p-3`}>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View
              className={`items-center justify-center w-8 h-8 rounded-full ${avatarBackground}`}
            >
              <Feather name="user" size={16} color={avatarIconColor} />
            </View>
            <Text className={`font-medium text-sm ${primaryText}`}>{comment.author}</Text>

            <Pressable onPress={() => seekToTime(comment.timeInSeconds)} className="flex-row items-center gap-1">
              <Feather name="clock" size={12} color="#2563EB" />
              <Text className="text-xs font-semibold text-blue-600"> {comment.timestamp}</Text>
            </Pressable>
          </View>

          <Text className={`text-sm font-semibold ${secondaryText}`}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text className={`${primaryText} mb-4`}>{comment.content}</Text>

        {!isReply && (
          <Pressable onPress={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="reply" size={14} color="#2563EB" />
            <Text className="text-sm text-blue-600">Reply</Text>
          </Pressable>
        )}
      </View>

      {replyTo === comment.id && (
        <View className="mt-2 ml-2 md:ml-4">
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
            <Pressable onPress={() => handleAddReply(comment.id)} className="px-3 py-2 rounded-md bg-blue-600">
              <Feather name="send" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {comment.replies?.map((reply) => (
        <View key={reply.id} className="mt-3">
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
  selectedVideo: { id: string | number; title?: string; notes?: string };
  videoUrl: string;
  onClose: () => void;
  visible?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"comments">("comments");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  const { user } = useAuth();
  const { comments, addComment, addReply } = useVideoComments(selectedVideo.id);
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const overlayBackground = isDark ? 'bg-black/90' : 'bg-black/80';
  const modalSurface = isDark ? 'bg-[#0f172a]' : 'bg-white';
  const headerBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const headerBackground = isDark ? 'bg-[#111827]' : 'bg-white';
  const titleColor = isDark ? 'text-gray-100' : 'text-gray-800';
  const subtitleColor = isDark ? 'text-gray-300' : 'text-gray-500';
  const videoShellBackground = isDark ? 'bg-black' : 'bg-gray-800';
  const sidebarBackground = isDark ? 'bg-[#0f172a]' : 'bg-gray-50';
  const sidebarBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBackground = isDark ? 'bg-gray-800 text-gray-100 border border-gray-600' : 'bg-white text-gray-900 border border-gray-300';
  const sendButtonBackground = isDark ? 'bg-gray-700' : 'bg-gray-900';
  const placeholderColor = isDark ? '#94A3B8' : '#6B7280';
  const emptyStateBorder = isDark ? 'border-gray-700 bg-[#111827]' : 'border-gray-200 bg-gray-50';
  const emptyIconBackground = isDark ? 'bg-gray-700' : 'bg-gray-200';
  const emptyIconColor = isDark ? '#94A3B8' : '#9ca3af';

  const videoRef = useRef<Video>(null);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status?.positionMillis != null) {
      setCurrentTime(Math.floor(status.positionMillis / 1000));
    }
  }, []);

  const getCurrentTimestamp = () => Math.floor(currentTime);

  const seekToTime = async (timeInSeconds: number) => {
    if (videoRef.current) {
      try {
        await videoRef.current.setPositionAsync(timeInSeconds * 1000);
      } catch { }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    Keyboard.dismiss()
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
      console.error("Failed to add comment:", err);
      Alert.alert("Error", "Failed to add comment: " + (err?.message || "Unknown error"));
    }
  };

  const handleAddReply = async (parentCommentId: string | number) => {
    if (!replyContent.trim()) return;
    Keyboard.dismiss()
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
      console.error("Failed to add reply:", err);
      Alert.alert("Error", "Failed to add reply: " + (err?.message || "Unknown error"));
    }
  };

  if (!isOpen) {
    return (
      <Pressable
        onPress={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 bg-blue-600 px-4 py-2 rounded-lg"
      >
        <Text className="text-white font-medium">Open Video Player</Text>
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent
      onRequestClose={() => {
        setIsOpen(false);
        onClose?.();
      }}
    >
      <View className={`flex-1 ${overlayBackground} items-center justify-center`}>
        <View className={`${modalSurface} rounded-lg w-[90%] h-[90%] md:h-[80%] overflow-hidden`}>
          {/* Header */}
          <View className={`flex-row items-center justify-between p-4 border-b ${headerBorder} ${headerBackground}`}>
            <Text
              className={`text-lg font-semibold ${activeTab === "comments"
                ? "text-[#C2A16C]"
                : subtitleColor
                }`}
            >
              Notes ({comments.length})
            </Text>
            <Pressable
              className={`${isDark ? 'bg-gray-700' : 'bg-gray-800'} rounded-md p-2 px-4`}
              onPress={() => {
                setIsOpen(false);
                onClose?.();
              }}
            >
              <Text className="text-white text-sm font-semibold">Close</Text>
            </Pressable>
          </View>

          <View className="flex-1 flex-col md:flex-row">
            <View className="flex-1 p-4">
              <View className={`rounded-md overflow-hidden ${videoShellBackground}`}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  useNativeControls
                  resizeMode="cover"
                  style={{ width: "100%", aspectRatio: 1 }}
                  onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                />
              </View>
            </View>

            <View className={`flex-1 w-full md:w-96 border-t md:border-t-0 md:border-l ${sidebarBorder} ${sidebarBackground}`}>
              <View className={`${headerBackground} flex-row`}>
                <View
                  className="flex-1 py-3 px-4 flex-row items-center gap-2"
                >
                  <Text className={`mt-2 text-xl font-semibold ${titleColor}`}>
                    {selectedVideo.title || "Video"}
                  </Text>
                </View>
              </View>

              <View className="flex-1">
                {activeTab === "comments" && (
                  <View className="flex-1 p-3 md:p-4">
                    <View className="mb-4 md:mb-6">
                      <View className="flex-row gap-2 items-center">
                        <TextInput
                          value={newComment}
                          onChangeText={setNewComment}
                          placeholder="Add a comment..."
                          className={`flex-1 px-3 py-4 rounded-md ${inputBackground}`}
                          returnKeyType="send"
                          onSubmitEditing={handleAddComment}
                          placeholderTextColor={placeholderColor}
                        />
                        <Pressable
                          onPress={handleAddComment}
                          className={`px-4 py-4 rounded-md ${sendButtonBackground}`}
                        >
                          <Feather name="send" size={16} color="#fff" />
                        </Pressable>
                      </View>
                      <Text className={`text-sm mt-3 font-semibold ${subtitleColor}`}>
                        Comment will be timestamped at {formatTime(getCurrentTimestamp())}
                      </Text>
                    </View>

                    <ScrollView className="max-h-96">
                      {comments.length === 0 ? (
                        <View className={`pt-4 border rounded-md p-2 py-4 items-center justify-center ${emptyStateBorder}`}>
                          <View
                            className={`${emptyIconBackground} items-center justify-center w-16 h-16 rounded-full`}
                          >
                            <Ionicons name="chatbox-outline" color={emptyIconColor} size={28} />
                          </View>
                          <Text className={`${subtitleColor} font-medium text-center w-2/3 mt-2`}>
                            No comments yet. Be the first to comment!
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
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
