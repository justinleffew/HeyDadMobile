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
            {isRetrying ? "Uploading" : "Retry Upload"}
          </Text>

          <Text className="text-gray-600 mb-4">
            {isRetrying
              ? "Your video is uploading. Please wait while we process it"
              : "An unsaved video upload was found. Would you like to continue processing it?"}
          </Text>

          {isRetrying ? (
            <View className="mb-4 w-full bg-gray-200 rounded-full h-2">
              <View
                className="bg-gray-800 h-2 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </View>
          ) : null}

          <View className="flex-row">
            {!isRetrying ? (
              <TouchableOpacity
                disabled={isRetrying}
                onPress={onCancel}
                className="flex-1 bg-gray-100 py-2 px-4 rounded-lg items-center justify-center active:bg-gray-200"
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() => {
                onRetry(() => setVideoCount((prevCount) => prevCount + 1));
              }}
              disabled={isRetrying}
              className={`ml-4 flex-1 py-2 px-4 rounded-lg flex-row items-center justify-center ${isRetrying
                ? "bg-gray-800 opacity-50"
                : "bg-gray-800 active:bg-gray-700"
                }`}
              activeOpacity={0.7}
            >
              {isRetrying ? (
                <View className="mr-2">
                  <AnimatedLoader />
                </View>
              ) : null}
              <Text className="text-white font-medium">
                {isRetrying ? "Uploading..." : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
