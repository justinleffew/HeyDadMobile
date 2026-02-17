import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

type PocketDadHeroProps = {
  onPressCta?: () => void;
};

const PocketDadHero: React.FC<PocketDadHeroProps> = ({ onPressCta }) => {
  return (
    <View className="mx-4 mb-6 rounded-3xl bg-[#061426] border border-white/10 p-6">
      <Text
        style={{ color: "#6F8F7B" }}
        className="text-xs font-semibold tracking-[0.15em] mb-3">
        INTRODUCING POCKET DAD
      </Text>

      <Text className="font-merriweather text-2xl leading-snug font-semibold text-white mb-3">
        Be the dad who always knows what to say
      </Text>

      <TouchableOpacity
        style={{ backgroundColor: "#6F8F7B" }}
        onPress={onPressCta}
        className="mt-1 flex-row items-center justify-center rounded-full px-4 py-4">
        <Feather name="message-circle" size={18} color="white" />
        <Text className="ml-2 text-base font-semibold text-white">
          Try Pocket Dad Free
        </Text>
        <Feather name="arrow-right" size={18} color="white" className="ml-2" />
      </TouchableOpacity>
    </View>
  );
};
export default PocketDadHero
