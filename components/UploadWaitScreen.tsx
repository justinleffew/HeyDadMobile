import { useState, useEffect, useMemo } from "react";
import { View, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const { width, height } = Dimensions.get("window");

const dadJokes = [
  "Why don't skeletons ever fight each other? They don't have the guts.",
  "I only know 25 letters of the alphabet. I don't know y.",
  "What do you call cheese that isn't yours? Nacho cheese.",
  "Why can't your nose be 12 inches long? Because then it would be a foot.",
  "I used to play piano by ear, but now I use my hands.",
  "What's brown and sticky? A stick.",
  "Why did the scarecrow win an award? Because he was outstanding in his field.",
  "What do you call fake spaghetti? An impasta.",
  "Why did the math book look sad? Because it had too many problems.",
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "What did the ocean say to the beach? Nothing, it just waved.",
  "Why do fathers take an extra pair of socks when they go golfing? In case they get a hole in one.",
  "I used to hate facial hair, but then it grew on me.",
  "What do you call a bear with no teeth? A gummy bear.",
  "How do you organize a space party? You planet.",
  "I wouldn't buy anything with velcro. It's a total rip-off.",
  "Why couldn't the bicycle stand up by itself? It was two-tired.",
  "What did the coffee report to the police? A mugging.",
  "I got fired from the calendar factory. All I did was take a day off.",
  "What do you call a sleeping dinosaur? A dino-snore.",
  "Why do cows wear bells? Because their horns don't work.",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
  "I just found out I'm colorblind. The diagnosis came completely out of the purple.",
  "What did the janitor say when he jumped out of the closet? Supplies!",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "I used to be a banker, but I lost interest.",
  "What do you call a factory that makes okay products? A satisfactory.",
  "Did you hear about the guy who invented the knock-knock joke? He won the no-bell prize.",
  "Why do dads always carry a spare joke? In case the first one doesn't land.",
];

const Sparkle = ({ style }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const progress = useSharedValue(-100);

  useEffect(() => {
    const t = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1000, { duration: style.duration, easing: Easing.circle }),
        -1,
        false
      );
    }, style.delay);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: style.duration / 2 }),
          withTiming(0, { duration: style.duration / 2 })
        ),
        -1,
        false
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: style.duration / 2 }),
          withTiming(0, { duration: style.duration / 2 })
        ),
        -1,
        false
      );
    }, style.delay);

    return () => clearTimeout(delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = -progress.value;

    return {
      opacity: opacity.value,
      transform: [{ translateY }, { scale: scale.value },],
    }
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: style.left,
          top: style.top,
          width: style.size,
          height: style.size,
          backgroundColor: "white",
          borderRadius: style.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

const Sparkles = ({ count = 50 }) => {
  const sparkles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const style = {
        left: Math.random() * width,
        top: Math.random() * height,
        size: Math.random() * 3 + 1,
        duration: (Math.random() * 5 + 15) * 1000,
        delay: Math.random() * 5000,
      };
      return <Sparkle key={i} style={style} />;
    });
  }, [count]);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {sparkles}
    </View>
  );
};

export default function UploadWaitScreen({ progress = 45 }) {
  const [currentJokeIndex, setCurrentJokeIndex] = useState(() =>
    Math.floor(Math.random() * dadJokes.length)
  );
  const jokeOpacity = useSharedValue(1);
  const jokeTranslateY = useSharedValue(0);

  useEffect(() => {
    const jokeInterval = setInterval(() => {
      jokeOpacity.value = withTiming(0, { duration: 500 });
      jokeTranslateY.value = withTiming(-16, { duration: 500 });

      setTimeout(() => {
        setCurrentJokeIndex((prev) => {
          let next;
          do {
            next = Math.floor(Math.random() * dadJokes.length);
          } while (next === prev && dadJokes.length > 1);
          return next;
        });
        jokeTranslateY.value = 0;
        jokeOpacity.value = withTiming(1, { duration: 500 });
      }, 500);
    }, 5000);

    return () => clearInterval(jokeInterval);
  }, []);

  const jokeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: jokeOpacity.value,
    transform: [{ translateY: jokeTranslateY.value }],
  }));

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View className="absolute inset-0 z-50 flex-1 items-center justify-center bg-black/80">
      <Sparkles count={40} />

      <View className="z-20 items-center justify-center">
        <View className="relative w-32 h-32 items-center justify-center">
          <Svg
            width={128}
            height={128}
            style={{ transform: [{ rotate: "-90deg" }] }}
          >
            <Circle
              cx="64"
              cy="64"
              r={radius}
              stroke="gray"
              strokeWidth="10"
              fill="none"
            />
            <Circle
              cx="64"
              cy="64"
              r={radius}
              stroke="#d1b48e"
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="text-2xl font-bold text-white">{progress}%</Text>
          </View>
        </View>

        <View className="mt-6 px-4" style={{ width: width * 0.66 }}>
          <Text className="text-white text-center">Please do not lock the screen or switch to other apps.</Text>
        </View>
      </View>

      <Animated.View
        style={[
          jokeAnimatedStyle,
          {
            backgroundColor: "rgba(255,255,255,0.3)",
            position: "absolute",
            bottom: 32,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 6,
            maxWidth: width * 0.83,
          },
        ]}
      >
        <Text className="text-lg text-white text-center text-base font-semibold">{dadJokes[currentJokeIndex]}</Text>
      </Animated.View>
    </View>
  );
}
