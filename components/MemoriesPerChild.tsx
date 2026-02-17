import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "providers/ThemeProvider";

type ChildCount = {
  child_id: string;
  name?: string | null;
  total: number;
};

type Props = {
  childCounts: ChildCount[];
  childAvatars: Record<string, string | undefined>;
  onAddChild: () => void;
  borderTint?: string;
  olive?: string;
  chipBg?: string;
  chipAccent?: string;
  darkText?: string;
};

const MemoriesPerChild: React.FC<Props> = ({
  childCounts,
  childAvatars,
  onAddChild,
  borderTint = "rgba(113,124,142,0.2)",
  olive = "#6B7D52",
  chipBg = "rgba(197,154,95,0.10)",
  chipAccent = "#C59A5F",
  darkText = "#111827",
}) => {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="mb-6">
      <View
        className={`rounded-2xl p-4 shadow-sm ${isDark ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-100'}`}
        style={{ borderWidth: 1, borderColor: borderTint }}
      >
        <Text
          className={`text-xs mb-2 font-semibold ${isDark ? 'text-gray-100' : 'text-slate-600'}`}
        >
          Stories per child
        </Text>

        {childCounts.length === 0 ? (
          <Pressable onPress={onAddChild} className="flex-row items-center">
            <Text className="text-sm underline" style={{ color: olive }}>
              Add a child to start tracking.
            </Text>
            <MaterialIcons name="chevron-right" size={18} style={{ color: olive, marginLeft: 2 }} />
          </Pressable>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {childCounts.map((c) => {
              const img = childAvatars[c.child_id];
              const initial = c.name?.[0] ?? "?";
              return (
                <View
                  key={c.child_id}
                  className={`flex-row items-center pr-3 py-1.5 rounded-full`}
                  style={{ borderWidth: 1, borderColor: borderTint, backgroundColor: isDark ? "#0f172a" : chipBg }}
                >
                  {img ? (
                    <Image
                      source={{ uri: img }}
                      accessibilityLabel={c.name ?? "Child"}
                      className="w-6 h-6 rounded-full mr-2"
                      style={{ borderWidth: 1, borderColor: "#9CA3AF", resizeMode: "cover" }}
                    />
                  ) : (
                    <View
                      className="w-6 h-6 rounded-full mr-2 items-center justify-center"
                      style={{ backgroundColor: chipAccent }}
                    >
                      <Text className="text-white text-[10px]">{initial}</Text>
                    </View>
                  )}

                  <Text className={`text-sm mr-3 font-semibold ${isDark ? 'text-gray-100' : 'text-slate-600'}`}>
                    {c.name} — {c.total}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

export default MemoriesPerChild;
