import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from 'expo-router'
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth } = Dimensions.get("window");
const ONBOARDING_DISMISSED_KEY = "onboardingPopupDismissed";

export default function OnboardingPopup() {
  const [stepsComplete, setStepsComplete] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dismissedHydrated, setDismissedHydrated] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const router = useRouter()

  const { hasAccess, hasName, hasChild, videoCount } = useAuth();
  const persistDismissal = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    } catch (error) {
      console.warn("Failed to persist onboarding popup dismissal", error);
    }
  }, []);

  const handleContinue = () => {
    setMinimized(true);
    if (!hasName) return router.replace("/(tabs)/settings");
    if (!hasChild) return router.replace("/(tabs)/children");
    if (!videoCount) return router.replace("/(tabs)/memories/capture");
    if (!hasAccess) return router.replace("/(tabs)/settings");
  };

  useEffect(() => {
    const complete = videoCount && hasChild && hasAccess && hasName;
    setStepsComplete(complete);
  }, [videoCount, hasChild, hasAccess, hasName]);

  useEffect(() => {
    const loadDismissedState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(ONBOARDING_DISMISSED_KEY);
        if (storedValue === "true") {
          setDismissed(true);
        }
      } catch (error) {
        console.warn("Failed to load onboarding popup dismissal state", error);
      } finally {
        setDismissedHydrated(true);
      }
    };

    loadDismissedState();
  }, []);

  useEffect(() => {
    if (!dismissedHydrated) return;

    if (!dismissed && !stepsComplete) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [dismissed, stepsComplete, scaleAnim, dismissedHydrated]);


  const handleClose = () => {
    Animated.spring(scaleAnim, {
      toValue: 0,
      tension: 100,
      friction: 7,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      persistDismissal();
    });
  };

  const navigateToStep = (route) => {
    setDismissed(true);
    persistDismissal();
    router.push(route);
  };

  if (!dismissedHydrated) return null;

  // If user closed it or they're fully done, don't render
  if (dismissed || stepsComplete) return null;

  return (
    <Modal transparent visible={!dismissed && !stepsComplete} animationType="none">
      <View className="flex-1 justify-center bg-black/50 px-4 pb-4">
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            width: screenWidth - 32,
          }}
          className={`bg-slate-800 rounded-2xl shadow-lg ${minimized ? "p-3" : "p-6"
            }`}
        >
          <TouchableOpacity
            onPress={handleClose}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 border border-white/15 items-center justify-center z-10"
          >
            <Ionicons name="close" size={16} color="#c59a5f" />
          </TouchableOpacity>

          <View className="items-center">
            <Image
              className="w-24 h-24 rounded-2xl justify-center items-center"
              source={require('../assets/logo.png')}
              contentFit="cover"
              transition={1000}
            />

            {minimized && (
              <Text className="text-gray-300 text-sm mt-1">
                Finish setting up your profile
              </Text>
            )}
          </View>

          {!minimized && (
            <>
              <Text className="font-merriweather text-center text-[#c59a5f] text-2xl mt-2">
                Welcome Dad!
              </Text>
              <Text className="text-center text-[#c59a5f] font-merriweather">
                Thanks for signing up.
              </Text>
              <Text className="text-gray-300 mt-4 text-sm">
                Let's set up your profile real quick.
              </Text>

              <View className="mt-4 space-y-3">
                <TouchableOpacity
                  onPress={() => navigateToStep("/(tabs)/settings")}
                  className={`bg-[#191b27] border-2 rounded-lg p-4 flex-row items-center ${hasName ? "border-[#c59a5f]" : "border-slate-800"
                    }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 border-[#c59a5f] items-center justify-center mr-2 ${hasName ? "bg-[#c59a5f]" : "bg-transparent"
                      }`}
                  >
                    {hasName && (
                      <Text className="text-black text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="ml-2 text-white text-sm">What's your name?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateToStep("(tabs)/children")}
                  className={`bg-[#191b27] border-2 rounded-lg p-4 flex-row items-center ${hasChild ? "border-[#c59a5f]" : "border-slate-800"
                    }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 border-[#c59a5f] items-center justify-center mr-2 ${hasChild ? "bg-[#c59a5f]" : "bg-transparent"
                      }`}
                  >
                    {hasChild && (
                      <Text className="text-black text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="ml-2 text-white text-sm">Add your first child</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setDismissed(true);
                    persistDismissal();
                    router.push("/record");
                  }}
                  className={`bg-[#191b27] border-2 rounded-lg p-4 flex-row items-center ${videoCount ? "border-[#c59a5f]" : "border-slate-800"
                    }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 border-[#c59a5f] items-center justify-center mr-2 ${videoCount ? "bg-[#c59a5f]" : "bg-transparent"
                      }`}
                  >
                    {videoCount && (
                      <Text className="text-black text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="ml-2 text-white text-sm">Create your first video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateToStep("/(tabs)/settings")}
                  className={`bg-[#191b27] border-2 rounded-lg p-4 flex-row items-center ${hasAccess ? "border-[#c59a5f]" : "border-slate-800"
                    }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 border-[#c59a5f] items-center justify-center mr-2 ${hasAccess ? "bg-[#c59a5f]" : "bg-transparent"
                      }`}
                  >
                    {hasAccess && (
                      <Text className="text-black text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="ml-4 text-white text-sm">Subscribe</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleContinue}
                className="mt-5 w-full bg-[#c59a5f] py-2 rounded-md items-center"
              >
                <Text className="font-medium text-white">Continue</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
