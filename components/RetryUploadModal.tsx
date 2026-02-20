import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from '@expo/vector-icons';
import UploadWaitScreen from "./UploadWaitScreen";
import { useAuth } from "hooks/useAuth";

const AnimatedLoader = () => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="reload-outline" size={16} color="rgba(59, 130, 246, 0.3)" />
    </Animated.View>
  );
};

export default function RetryUploadModal({
  show,
  isRetrying,
  progress,
  onRetry,
  onCancel,
  errorMessage,
}) {
  const { setVideoCount } = useAuth();

  if (isRetrying) {
    return <UploadWaitScreen progress={progress} />;
  }

  return (
    <Modal
      visible={show}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-gray-600/50 items-center justify-center px-4">
        <View className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <Text className="text-lg font-semibold text-red-900 mb-4">
            Retry Upload
          </Text>

          <Text className="text-gray-600 mb-4">
            An unsaved video upload was found. Would you like to continue processing it?
          </Text>

          {errorMessage ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#991B1B', fontSize: 13, lineHeight: 18 }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View className="flex-row">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 bg-gray-100 py-2 px-4 rounded-lg items-center justify-center active:bg-gray-200"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-medium">Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onRetry(() => setVideoCount((prevCount) => prevCount + 1));
              }}
              className="ml-4 flex-1 py-2 px-4 rounded-lg flex-row items-center justify-center bg-gray-800 active:bg-gray-700"
              activeOpacity={0.7}
            >
              <Text className="text-white font-medium">Retry Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
