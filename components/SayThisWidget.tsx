import React, { useEffect, useRef, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import type { AgeGroup, SayThisItem, Tone } from "data/sayThisData";
import { sayThisData } from "data/sayThisData";
import { useTheme } from '../providers/ThemeProvider';

const toneOptions: { key: Tone; label: string }[] = [
  { key: "gentle", label: "🪶 Gentle" },
  { key: "calm", label: "💬 Calm" },
  { key: "direct", label: "🔥 Direct" },
];

const ageGroups: AgeGroup[] = ["3-5", "6-8", "9-12"];

export default function SayThisWidgetNative() {
  const [data, setData] = useState<ReadonlyArray<SayThisItem>>([]);
  const [age, setAge] = useState<AgeGroup>("6-8");
  const [moment, setMoment] = useState<string>("Screen-time ending");
  const [tone, setTone] = useState<Tone>("gentle");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const scrollViewRef = useRef(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    setData(Array.isArray(sayThisData) ? sayThisData : []);
  }, []);

  useEffect(() => {
    if (!moment && data.length > 0) {
      setMoment(data[0].moment);
    }
  }, [data, moment]);

  const moments = useMemo(
    () => Array.from(new Set(data.map((d) => d.moment))),
    [data]
  );

  const filtered: ReadonlyArray<SayThisItem> = useMemo(
    () => data.filter((d) => d.moment === moment && d.ageGroup === age),
    [data, moment, age]
  );

  const current = filtered[0];
  const selectedTone = toneOptions.find(({ key }) => key === tone);

  const handleSubmit = () => {
    if (!moment) return;
    setHasSubmitted(true);
    setShowWhy(false);
    setTimeout(() => {
      scrollToBottom()
    }, 300);
  };

  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const headlineTextClass = !isDark ? 'text-gray-100' : 'text-gray-100';
  const bodyTextClass = !isDark ? 'text-gray-400' : 'text-gray-400';

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={{ paddingBottom: 32, }}
      className="w-full mx-auto max-w-[56rem] border border-zinc-800 bg-slate-800 p-4 shadow-xl">
      <View className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <View>
          <Text className={`text-center text-2xl font-merriweather mb-2 ${headlineTextClass}`}>
            Stuck on: Bedtime? Backtalk? Tough Questions?
          </Text>
          <Text className={`text-center text-base ${bodyTextClass}`}>
            Get research-backed phrases for tough parenting moments.
          </Text>

        </View>
      </View>

      {/* Controls */}
      <View className="mt-5">
        <View className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Moment */}
          <View className="col-span-1 mt-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              Moment
            </Text>

            <View className="rounded-xl bg-slate-900 border border-zinc-700">
              <Picker
                selectedValue={moment || ""}
                onValueChange={(value) => {
                  setMoment(String(value));
                  setHasSubmitted(false);
                  setShowWhy(false);
                }}
                dropdownIconColor="#e4e4e7"
                style={{ color: "#e4e4e7" }}
              >
                {!moment ? (
                  <Picker.Item color="white" style={{ color: "white" }} label="Select a moment" value="" />
                ) : null}
                {moments.map((m) => (
                  <Picker.Item color="white" style={{ color: "white" }} key={m} label={m} value={m} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Age */}
          <View className="col-span-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              Age
            </Text>
            <View className="flex flex-row gap-2">
              {ageGroups.map((ag) => {
                const selected = age === ag;
                return (
                  <Pressable
                    key={ag}
                    onPress={() => {
                      setAge(ag);
                      setHasSubmitted(false);
                      setShowWhy(false);
                    }}
                    className={`flex-1 rounded-xl px-3 py-2 border transition ${selected
                      ? "border-amber-400 bg-amber-400/10"
                      : "bg-zinc-900 border-zinc-700"
                      }`}
                  >
                    <Text
                      className={`text-center text-base ${selected
                        ? "text-amber-200"
                        : "text-zinc-300"
                        }`}
                    >
                      {ag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tone */}
          <View className="col-span-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              Tone
            </Text>
            <View className="flex flex-row gap-2">
              {toneOptions.map((toneOption) => {
                const selected = tone === toneOption.key;
                return (
                  <Pressable
                    key={toneOption.key}
                    onPress={() => {
                      setTone(toneOption.key);
                      setShowWhy(false);
                    }}
                    className={`flex-1 rounded-xl px-3 py-2 border transition ${selected
                      ? "border-amber-400 bg-amber-400/10"
                      : "bg-zinc-900 border-zinc-700"
                      }`}
                  >
                    <Text
                      className={`text-center text-base ${selected
                        ? "text-amber-200"
                        : "text-zinc-300"
                        }`}
                    >
                      {toneOption.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Submit */}
        <View className="flex flex-row justify-end mt-8">
          <Pressable
            onPress={handleSubmit}
            disabled={!moment || data.length === 0}
            className={`w-full rounded-xl px-4 py-4 ${moment && data.length > 0
              ? "bg-amber-400"
              : "bg-zinc-800"
              }`}
          >
            <Text
              className={`text-lg font-semibold text-center ${moment && data.length > 0
                ? "text-zinc-950"
                : "text-zinc-500"
                }`}
            >
              Show scripts
            </Text>
          </Pressable>
        </View>

        {/* Results */}
        {hasSubmitted && current ? (
          <View className="mt-8 space-y-4">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-300">
              Say This
            </Text>

            <View className="rounded-2xl border border-amber-400/40 bg-zinc-900/60 p-4 shadow-[0_0_0_1px_rgba(251,191,36,0.15)] space-y-3">
              <View className="flex flex-row items-start justify-between gap-3">
                <Text className="text-sm font-semibold text-amber-300">
                  {selectedTone?.label}
                </Text>

                <Pressable onPress={() => setShowWhy((prev) => !prev)}>
                  <Text className="text-sm font-medium text-amber-200">
                    {showWhy ? "Hide why this works" : "Why this works"}
                  </Text>
                </Pressable>
              </View>

              <Text className="mt-3 text-base leading-relaxed text-zinc-100">
                {current.responses[tone]}
              </Text>

              <View className="mt-3 flex flex-row flex-wrap gap-2">
                <View className="rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1">
                  <Text className="text-xs font-medium uppercase tracking-wide text-amber-200">
                    Dad Move: {current.dadMove}
                  </Text>
                </View>
              </View>

              {showWhy ? (
                <View className="rounded-xl border border-amber-400/30 bg-zinc-900/70 p-3">
                  <Text className="text-sm text-zinc-200">
                    {current.whyThisWorks}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : hasSubmitted ? (
          <View className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <Text className="text-sm text-zinc-300">
              No entry found for this age yet. Try switching age to 6–8 for the initial dataset.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
