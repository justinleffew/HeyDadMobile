import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";

const { width, height } = Dimensions.get('window')

export default function NotesModal({ onClose, title, notes, created_at, visible = true }) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#0f172a' : '#FFFFFF';
  const headerBorder = isDark ? '#374151' : '#e8e5e0';
  const titleColor = isDark ? '#f3f4f6' : '#1B2838';
  const dateColor = isDark ? '#9ca3af' : '#6B7280';
  const bodyColor = isDark ? '#d1d5db' : '#374151';
  const closeButtonBg = isDark ? '#1f2937' : '#f5f3ef';
  const closeButtonText = isDark ? '#d1d5db' : '#1B2838';
  const accentColor = '#D4A853';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 relative bg-black/60 justify-center items-center p-4">
        <View
          style={{
            width: width - 32,
            maxHeight: height * 0.85,
            backgroundColor: bgColor,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          {/* Header */}
          <View
            style={{
              padding: 24,
              paddingBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: headerBorder,
            }}
          >
            {/* Close button */}
            <Pressable
              onPress={onClose}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: closeButtonBg,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Ionicons name="close" size={18} color={closeButtonText} />
            </Pressable>

            {/* Gold accent line */}
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
                fontSize: 24,
                fontWeight: '700',
                color: titleColor,
                marginBottom: 8,
                paddingRight: 40,
                lineHeight: 30,
              }}
            >
              {title}
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: dateColor,
                fontWeight: '500',
              }}
            >
              {new Date(created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 24,
              paddingBottom: 32,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                lineHeight: 26,
                color: bodyColor,
                fontWeight: '400',
              }}
            >
              {notes}
            </Text>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: headerBorder,
            }}
          >
            <Pressable
              onPress={onClose}
              style={{
                backgroundColor: isDark ? '#1f2937' : '#1B2838',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
