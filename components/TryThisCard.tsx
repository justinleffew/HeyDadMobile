import React from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';

type Props = {
  prompt?: string | null;
  shufflePrompt: () => void;
  onRecord: (selectedPrompt: string | null | undefined) => void;
  onBrowseAll: () => void;
};

const TryThisCard: React.FC<Props> = ({
  prompt,
  shufflePrompt,
  onRecord,
  onBrowseAll,
}) => {
  return (
    <LinearGradient
      colors={['#061426', '#031329', '#1E293B']}
      end={{ x: 1, y: 0 }}
      className="overflow-hidden mb-6 rounded-2xl shadow-md p-5"
      style={{ marginBottom: 24, padding: 14, borderWidth: 1, borderColor: "rgba(113,124,142,0.5)", borderRadius: 16 }}
    >
      <View className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full -translate-y-8 translate-x-8" />
      <View className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/20 rounded-full translate-y-8 -translate-x-8" />

      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 rounded-xl bg-white/15 items-center justify-center">
            <Ionicons name="bulb" size={16} color="white" />
          </View>
          <Text className="text-[#C2A16C] text-xs font-medium tracking-[0.15em] uppercase">Story Prompts</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={shufflePrompt}
          className="p-2 rounded-md border border-white/20 active:bg-white/10">
          <Ionicons name="shuffle" size={16} color="white" />
        </Pressable>
      </View>

      <Text
        className="font-merriweather text-white text-2xl text-center mb-5"
      >
        {prompt || "Loading..."}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => onRecord(prompt ?? null)}
        className="mx-auto w-full max-w-[20rem] rounded-full shadow"
      >
        <LinearGradient
          colors={["#D4B996", "#C2A16C", "#D4B996"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ paddingTop: 12, paddingBottom: 12, borderRadius: "8%" }}
          className="overflow-hidden px-5 rounded-full justify-center items-center"
        >
          <Text className="text-white font-medium text-center">Record this Story</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View className="mt-3 items-center">
        <Pressable
          accessibilityRole="button"
          onPress={onBrowseAll}
          className="active:opacity-90"
        >
          <Text className="text-white/90 text-xs underline underline-offset-2 decoration-white/40">
            Browse all prompts →
          </Text>
        </Pressable>
        <View >
        </View>
      </View>
    </LinearGradient>
  );
};

export default TryThisCard;
