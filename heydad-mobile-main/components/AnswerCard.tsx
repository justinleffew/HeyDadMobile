import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  forwardRef,
} from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ViewProps,
  TextProps,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { PocketDadAnswer } from "../utils/parsePocketDad";

type Tone = "direct" | "gentle" | "playful";

type ChildSummary = {
  id: string | null;
  name?: string | null;
  ageLabel?: string | null;
  profileNote?: string | null;
  avatarUrl?: string | null;
};

type AnswerCardProps = {
  tone: Tone;
  onToneChange: (tone: Tone) => void;
  answer: PocketDadAnswer | null;
  loading: boolean;
  child: ChildSummary | null;
  error?: string | null;
  onRetry?: () => void;
  onLike?: () => void;
  liked?: boolean;
  likeDisabled?: boolean;
  likePending?: boolean;
  onPivot?: () => void;
  pivotPending?: boolean;
  pivotDisabled?: boolean;
  onRecordLater?: () => void;
};

const toneLabels: Record<Tone, string> = {
  direct: "Direct",
  gentle: "Gentle",
  playful: "Playful",
};

const toneEmojis: Record<Tone, string> = {
  direct: "💬",
  gentle: "🌿",
  playful: "🎈",
};

const errorCopy = {
  multi: "Pick at least one (max two).",
  text: "Give a bit more detail (3–160 chars).",
};


/** Simple className merger for nativewind */
function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function AnswerCard({
  tone,
  onToneChange,
  answer,
  loading,
  child,
  error,
  onRetry,
  onRecordLater,
}: AnswerCardProps) {
  const [openAlternative, setOpenAlternative] = useState<number | null>(null);
  const [showAlternativesCard, setShowAlternativesCard] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [primaryVisible, setPrimaryVisible] = useState(false);
  const [insightsReady, setInsightsReady] = useState(false);

  const primaryAction = answer?.primaryAction ?? null;
  const alternatives = answer?.alternatives ?? [];
  const insights = answer?.insights ?? [];

  useEffect(() => {
    setOpenAlternative(null);
    setShowAlternativesCard(false);
    setShowInsights(false);
    setPrimaryVisible(false);
    setInsightsReady(false);
  }, [primaryAction?.title, alternatives.length, insights.length]);

  useEffect(() => {
    if (!primaryAction) {
      setPrimaryVisible(false);
      return;
    }

    const timeout = setTimeout(() => {
      setPrimaryVisible(true);
    }, 20);

    return () => clearTimeout(timeout);
  }, [primaryAction?.title]);

  useEffect(() => {
    if (!insights.length) {
      setInsightsReady(false);
      return;
    }

    const timeout = setTimeout(() => {
      setInsightsReady(true);
    }, 240);

    return () => clearTimeout(timeout);
  }, [insights.length, primaryAction?.title]);

  const hasAnswer = Boolean(answer);


  return (
    <View className="flex w-full flex-col gap-6 rounded-[20px] bg-slate-800 p-6 text-[#2C2C2C] shadow-xl sm:p-9">
      <View className="flex flex-col gap-5">
        <View className="flex-row items-start justify-between gap-4">
        </View>

      </View>

      {!loading && hasAnswer ?
        <View
          className={cn(
            "rounded-3xl border border-slate-500/50 bg-slate-100 p-5",
            primaryAction
              ? primaryVisible
                ? "opacity-100"
                : "opacity-0"
              : "opacity-100"
          )}>
          {loading && !hasAnswer ? (
            <PrimarySkeleton />
          ) : primaryAction ? (
            <View className="flex flex-col gap-6">
              <View className="flex flex-col gap-1">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Start here
                  </Text>
                  <Text className="text-sm italic text-slate-500">
                    Try this first
                  </Text>
                </View>
                <Text className="mt-4 font-merriweather text-3xl font-semibold text-slate-600">
                  {primaryAction.title}
                </Text>
              </View>

              {primaryAction.script ? (
                <View className="space-y-2">
                  <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Say this:
                  </Text>
                  <View className="mt-3 rounded-2xl border border-amber-300 bg-white/80 p-4">
                    <Text className="text-base italic text-slate-500">
                      {primaryAction.script}
                    </Text>
                  </View>
                </View>
              ) : null}

              {primaryAction.content.length ? (
                <View className="space-y-3">
                  <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Then do this:
                  </Text>
                  <View className="space-y-2 mt-3">
                    {primaryAction.content.map((item) => (
                      <View key={item} className="flex flex-row gap-4">
                        <View className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-600" />
                        <Text className="flex-1 text-base leading-relaxed text-slate-600">
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        : null}

      <View className="flex flex-col gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-white">
          Choose a tone
        </Text>
        <View className="grid grid-cols-3 gap-3">
          {(Object.keys(toneLabels) as Tone[]).map((toneKey) => {
            const isActive = toneKey === tone;
            return (
              <Pressable
                key={toneKey}
                onPress={() => onToneChange(toneKey)}
                className={cn(
                  "flex flex-row items-center justify-center gap-2 rounded-full border px-4 py-4 text-sm font-semibold",
                  isActive
                    ? "border-transparent bg-[#C59A5F]"
                    : "border-[#D1D1D1] bg-white"
                )}>
                <Text>{toneEmojis[toneKey]}</Text>
                <Text
                  numberOfLines={1}
                  className={cn(
                    "font-medium truncate",
                    isActive ? "text-white" : "text-[#2C2C2C]"
                  )}
                >
                  {toneLabels[toneKey]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {alternatives.length ? (
        <View className="flex flex-col gap-3">
          <SmallButton
            variant="ghost"
            onPress={() => {
              setShowAlternativesCard((previous) => {
                const next = !previous;
                if (!next) setOpenAlternative(null);
                return next;
              });
            }}
          >
            <Text className="text-sm font-semibold text-slate-400">Try something else</Text>
          </SmallButton>

          {showAlternativesCard ? (
            <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <View className="flex flex-col gap-1">
                <Text className="text-xl font-semibold text-slate-600">
                  If That Doesn’t Work…
                </Text>
                <Text className="text-sm text-slate-500">
                  Explore backup plays tailored for this moment.
                </Text>
              </View>
              <View className="mt-4 space-y-3">
                {alternatives.map((alternative, index) => {
                  const isOpen = openAlternative === index;
                  return (
                    <View
                      key={`${alternative.title}-${index}`}
                      className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200"
                    >
                      <Pressable
                        onPress={() =>
                          setOpenAlternative(isOpen ? null : index)
                        }
                        className="flex w-full flex-row items-center justify-between gap-3 px-4 py-3"
                      >
                        <Text className="flex-1 text-base font-semibold text-slate-500">
                          {alternative.title}
                        </Text>
                        <Feather
                          name="chevron-down"
                          size={16}
                          color="#374151"
                          style={{
                            transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
                          }}
                        />
                      </Pressable>
                      {isOpen ? (
                        <View className="border-t border-slate-200 bg-white/90 px-4 py-4">
                          {alternative.content.length ? (
                            <View className="space-y-2">
                              {alternative.content.map((item) => (
                                <View
                                  key={item}
                                  className="flex flex-row gap-3"
                                >
                                  <View className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  <Text className="flex-1 text-base leading-relaxed text-slate-600">
                                    {item}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                          {alternative.script ? (
                            <View className="mt-4 rounded-xl border border-amber-200 bg-white/90 p-3">
                              <Text className="text-base italic text-slate-600">
                                {alternative.script}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {insights.length ? (
        <View className="flex flex-col gap-3">
          <View className="rounded-3xl border border-slate-100 bg-slate-100 p-5">
            <Text className="text-xl font-semibold text-slate-600">
              Why It Works
            </Text>
            <View className="mt-3 space-y-2">
              {insights.map((insight) => (
                <Text
                  key={insight}
                  className="text-sm leading-relaxed text-slate-600"
                >
                  {insight}
                </Text>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <View className="flex flex-col gap-4" />

      {/* Error */}
      {error ? (
        <View className="rounded-[18px] border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <View className="flex flex-row items-center justify-between gap-3">
            <Text className="text-sm text-rose-800">{error}</Text>
            {onRetry ? (
              <Pressable
                onPress={onRetry}
                className="rounded-full border border-rose-300 px-3 py-1"
              >
                <Text className="text-xs font-semibold text-rose-700">
                  Retry
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
function PrimarySkeleton() {
  return (
    <View className="space-y-4">
      <View className="space-y-2">
        <View className="h-2 w-32 animate-pulse rounded-full bg-slate-200" />
        <View className="h-2 mt-2 w-2/3 animate-pulse rounded-full bg-slate-300" />
      </View>
      <View className="mt-4 space-y-2">
        <View className="h-2 w-full animate-pulse rounded-full bg-slate-300" />
        <View className="h-2 mt-2 w-4/5 animate-pulse rounded-full bg-slate-300" />
        <View className="h-2 mt-2 w-3/5 animate-pulse rounded-full bg-slate-300" />
      </View>
      <View className="mt-4 h-2 w-full animate-pulse rounded-[18px] bg-slate-200" />
      <View className="mt-2 h-2 mb-8 w-40 animate-pulse rounded-full bg-slate-300" />
    </View>
  );
}

type SmallButtonProps = React.ComponentProps<typeof Pressable> & {
  variant?: "ghost" | "solid";
};

const SmallButton = forwardRef<Pressable, SmallButtonProps>(
  ({ variant = "solid", className, children, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        className={cn(
          "inline-flex border border-slate-600 flex-row items-center justify-center rounded-full px-3 py-2 text-sm font-semibold",
          variant === "ghost"
            ? "bg-transparent text-slate-600"
            : "border border-slate-200 bg-white text-slate-500 shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
);

SmallButton.displayName = "SmallButton";
