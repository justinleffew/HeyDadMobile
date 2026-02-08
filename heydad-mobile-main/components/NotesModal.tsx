import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
const { width, height } = Dimensions.get('window')
export default function NotesModal({ onClose, title, notes, created_at, visible }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 relative bg-black/60 justify-center items-center p-0 backdrop-blur-sm">
        <LinearGradient
          colors={["#FEF3C7", "#FFEDD5"]}
          style={{ width, height, padding: 16, paddingBottom: 32 }}
          className="rounded-2xl shadow-2xl w-full max-w-3xl h-5/6 border-4 border-amber-200 overflow-hidden"
        >
          <View className="absolute top-0 left-0 w-32 h-32 bg-amber-300 rounded-full opacity-20 -translate-x-16 -translate-y-16" />
          <View className="absolute bottom-0 right-0 w-40 h-40 bg-orange-300 rounded-full opacity-20 translate-x-20 translate-y-20" />

          <View className="absolute top-8 right-12 opacity-60">
            <FontAwesome name="star" size={24} color="#FBBF24" />
          </View>
          <View className="absolute top-16 right-24 opacity-40">
            <FontAwesome name="star" size={16} color="#FB923C" />
          </View>

          <View className="relative p-8 border-b-2 border-amber-300">
            <View className="items-center">
              <View className="mb-3">
                <Ionicons name="heart" size={32} color="#E11D48" />
              </View>
              <Text
                className="text-3xl font-bold text-center mb-2"
                style={{
                  color: "#92400E",
                }}
              >
                {title}
              </Text>
              <Text className="text-amber-700 font-medium italic">
                {new Date(created_at).toDateString()}
              </Text>
            </View>
          </View>

          <View className="flex-1 relative p-3">
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="bg-white/70 rounded-xl p-8 border border-amber-200 shadow-inner">
              <View className="pb-20">
                <Text className="text-gray-800 leading-relaxed font-serif whitespace-pre-wrap">
                  {notes}
                </Text>
              </View>

            </ScrollView>
          </View>

          <LinearGradient
            colors={["#FEF3C7", "#FFEDD5"]}
            className="border-t-2 border-amber-300 p-6 flex-row justify-center"
          >
            <Pressable
              onPress={onClose}
              className="w-full px-6 py-3 bg-gray-800 rounded-full shadow-md active:scale-95 flex-row items-center justify-center"
            >
              <Text className="text-white font-semibold text-base">Close</Text>
            </Pressable>
          </LinearGradient>
        </LinearGradient>
      </View>
    </Modal>
  );
}
