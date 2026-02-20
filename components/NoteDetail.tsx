import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../providers/ThemeProvider";
import { useAuth } from "hooks/useAuth";
import { useNarrationComments, NarrationComment } from "hooks/useNarrationComments";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

export default function NoteDetail({
  note,
  visible = true,
  onClose,
  onDelete,
}: {
  note: { id: string; title?: string | null; notes?: string | null; created_at: string };
  visible?: boolean;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { comments, loading: commentsLoading, addComment } = useNarrationComments(note.id);

  const [newComment, setNewComment] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bgColor = isDark ? "#0f172a" : "#FFFFFF";
  const titleColor = isDark ? "#f3f4f6" : "#1B2838";
  const dateColor = isDark ? "#9ca3af" : "#6B7280";
  const bodyColor = isDark ? "#d1d5db" : "#374151";
  const borderColor = isDark ? "#374151" : "#e8e5e0";
  const inputBg = isDark ? "#1f2937" : "#F5F3EF";
  const commentBg = isDark ? "#1f2937" : "#F9F8F6";
  const accentColor = "#D4A853";

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await addComment({
        content: newComment,
        author: "Dad",
        author_id: user?.id || null,
      });
      setNewComment("");
    } catch (err: any) {
      Alert.alert("Error", "Failed to add note: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  }, [newComment, submitting, addComment, user?.id]);

  const formattedDate = new Date(note.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: insets.top + 12,
              paddingBottom: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            }}
          >
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="arrow-back" size={24} color={titleColor} />
            </Pressable>

            <Text
              style={{
                flex: 1,
                fontSize: 17,
                fontWeight: "600",
                color: titleColor,
                textAlign: "center",
                marginHorizontal: 8,
              }}
              numberOfLines={1}
            >
              Note
            </Text>

            <Pressable
              onPress={() => setShowMenu(!showMenu)}
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={titleColor} />
            </Pressable>
          </View>

          {/* Menu dropdown */}
          {showMenu && (
            <View style={{ position: "relative", zIndex: 100 }}>
              <Pressable
                onPress={() => setShowMenu(false)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: -2000,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 16,
                  backgroundColor: isDark ? "#1f2937" : "#FFFFFF",
                  borderRadius: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: borderColor,
                  minWidth: 160,
                  zIndex: 200,
                }}
              >
                {onDelete && (
                  <Pressable
                    onPress={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 15, color: "#EF4444", fontWeight: "500" }}>Delete Note</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Scrollable content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Note content */}
            <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
              {/* Gold accent bar */}
              <View
                style={{
                  width: 40,
                  height: 3,
                  backgroundColor: accentColor,
                  borderRadius: 2,
                  marginBottom: 16,
                }}
              />

              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "700",
                  color: titleColor,
                  marginBottom: 8,
                  lineHeight: 32,
                }}
              >
                {note.title || "Untitled Note"}
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: dateColor,
                  fontWeight: "500",
                  marginBottom: 24,
                }}
              >
                {formattedDate}
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 26,
                  color: bodyColor,
                  fontWeight: "400",
                }}
              >
                {note.notes || ""}
              </Text>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: borderColor,
                marginHorizontal: 24,
                marginTop: 32,
                marginBottom: 20,
              }}
            />

            {/* Notes / Comments section */}
            <View style={{ paddingHorizontal: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <Ionicons name="chatbubble-outline" size={18} color={accentColor} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 17, fontWeight: "600", color: titleColor }}>
                  Notes
                </Text>
                {comments.length > 0 && (
                  <View
                    style={{
                      marginLeft: 8,
                      backgroundColor: isDark ? "#374151" : "#F0F0ED",
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: dateColor }}>{comments.length}</Text>
                  </View>
                )}
              </View>

              {commentsLoading ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={accentColor} />
                </View>
              ) : comments.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 28,
                    alignItems: "center",
                    backgroundColor: commentBg,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="chatbox-outline" size={24} color={dateColor} style={{ marginBottom: 8 }} />
                  <Text style={{ color: dateColor, fontSize: 14, fontWeight: "500" }}>
                    No notes yet. Add the first one below.
                  </Text>
                </View>
              ) : (
                comments.map((c: NarrationComment) => (
                  <View
                    key={c.id}
                    style={{
                      backgroundColor: commentBg,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: accentColor,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        color: isDark ? "#e5e7eb" : "#1B2838",
                        lineHeight: 22,
                        marginBottom: 6,
                      }}
                    >
                      {c.content}
                    </Text>
                    <Text style={{ fontSize: 12, color: dateColor }}>{relativeTime(c.createdAt)}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Bottom input bar */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: insets.bottom + 10,
              borderTopWidth: 1,
              borderTopColor: borderColor,
              backgroundColor: bgColor,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a note..."
              placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
              multiline
              style={{
                flex: 1,
                backgroundColor: inputBg,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 15,
                color: isDark ? "#f3f4f6" : "#1B2838",
                maxHeight: 100,
                borderWidth: 1,
                borderColor: borderColor,
              }}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleAddComment}
            />
            <Pressable
              onPress={handleAddComment}
              disabled={!newComment.trim() || submitting}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: newComment.trim() ? accentColor : isDark ? "#374151" : "#e8e5e0",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={newComment.trim() ? "#1B2838" : dateColor} />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={newComment.trim() ? "#1B2838" : dateColor}
                />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
