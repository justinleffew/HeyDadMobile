import { View, Text, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';

export default function SplashScreen() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const translateY = useSharedValue(50);
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(1);
  const gradientOpacity = useSharedValue(0);

  const [showSubtext, setShowSubtext] = useState(false);

  useEffect(() => {
    gradientOpacity.value = withTiming(1, { duration: 1000 });
    opacity.value = withTiming(1, { duration: 800 });
    scale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
    });

    rotate.value = withSequence(
      withTiming(5, { duration: 600 }),
      withTiming(0, { duration: 400 })
    );

    const t1 = setTimeout(() => {
      translateY.value = withSpring(0, {
        damping: 12,
        stiffness: 100,
      });
    }, 500);

    const t2 = setTimeout(() => {
      runOnJS(setShowSubtext)(true);
    }, 1200);

    const t3 = setTimeout(() => {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }, 1500);

    const t4 = setTimeout(() => {
      router.replace('/(auth)/sign-in');
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value * pulse.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const subtextStyle = useAnimatedStyle(() => ({
    opacity: showSubtext ? withTiming(1, { duration: 600 }) : 0,
    transform: [
      { translateY: showSubtext ? withTiming(0, { duration: 600 }) : 20 }
    ],
  }));

  const backgroundStyle = useAnimatedStyle(() => {
    const gradientProgress = gradientOpacity.value;
    return {
      opacity: gradientProgress,
    };
  });

  const floatingIconStyle = useAnimatedStyle(() => {
    const floatY = interpolate(
      pulse.value,
      [1, 1.1],
      [0, -10]
    );
    return {
      transform: [{ translateY: floatY }],
      opacity: showSubtext ? withTiming(0.3, { duration: 800 }) : 0,
    };
  });

  return (
    <View className="flex-1 relative overflow-hidden">
      <Animated.View
        style={backgroundStyle}
        className="absolute inset-0 bg-slate-900"
      />

      <Animated.View
        style={[floatingIconStyle, { position: 'absolute', top: 100, left: 30 }]}
      >
        <Ionicons name="heart" size={24} color="rgba(59, 130, 246, 0.3)" />
      </Animated.View>

      <Animated.View
        style={[floatingIconStyle, { position: 'absolute', top: 150, right: 50 }]}
      >
        <Ionicons name="videocam" size={28} color="rgba(59, 130, 246, 0.2)" />
      </Animated.View>

      <Animated.View
        style={[floatingIconStyle, { position: 'absolute', bottom: 200, left: 150 }]}
      >
        <Ionicons name="people" size={26} color="rgba(59, 130, 246, 0.25)" />
      </Animated.View>

      <View className="flex-1 justify-center items-center px-8">
        <Animated.View style={logoStyle} className="mb-8">
          <View className="relative">
            <View className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-30 scale-110" />
            <View className="w-28 h-28 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl justify-center items-center shadow-2xl">
              <Image
                className="w-24 h-24 rounded-2xl justify-center items-center"
                source={require('../assets/logo.png')}

              />
            </View>

            <View className="absolute inset-2 rounded-2xl border border-white/20" />
          </View>
        </Animated.View>

        <Animated.View
          style={subtextStyle}
          className="absolute bottom-20 flex-row space-x-2"
        >
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              className="w-2 h-2 mx-1 bg-[#a78658] rounded-full"
            />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}
