import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  DEFAULTS,
  MAX_MULTI_SELECTION,
  MultiQuestionKey,
  ONBOARDING_FLOW,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_VERSION,
  OnboardingAnswers,
  OnboardingQuestion,
  TextQuestionKey,
  TOTAL_ONBOARDING_STEPS,
  validateMulti,
  validateShort,
} from "../data/onboarding";

import {
  fetchQuizResult,
  finalizeOnboarding,
  upsertAnswer,
  type QuizResultPayload,
} from "../utils/onboardingClient";

import { scoreOnboarding } from "../utils/archetype";
import { useAuth } from "hooks/useAuth";

type TouchedState = Record<
  keyof Pick<
    OnboardingAnswers,
    | "parenting_style"
    | "deescalation_first_move"
    | "legacy_anchor"
    | "priority_help_types"
    | "advice_tone"
  >,
  boolean
>;

type OnboardingProps = {
  onComplete?: () => void;
};

export const OnboardingKeys = {
  ParentingStyle: "dad_parenting_style",
  FirstMoveWhenUpset: "dad_first_move_when_upset",
  WhatKidsRemember: "dad_what_kids_remember",
  HelpFromPocketDad: "dad_help_from_pocketdad",
  PocketDadTone: "dad_style_default",
} as const;

const createBlankAnswers = (): OnboardingAnswers => ({
  parenting_style: [],
  deescalation_first_move: "",
  legacy_anchor: "",
  priority_help_types: [],
  advice_tone: [],
  version: ONBOARDING_VERSION,
});

const errorCopy = {
  multi: "Pick at least one (max two).",
  text: "Give a bit more detail (3–160 chars).",
};

type SkipConfirmModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
};

const SkipConfirmModal = ({
  visible,
  onCancel,
  onConfirm,
  loading,
}: SkipConfirmModalProps) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6">
          <Text className="text-xl font-semibold text-dad-dark">
            Skip setup?
          </Text>
          <Text className="mt-2 text-sm text-slate-600">
            We’ll use the default Pocket Dad settings so you can jump right in.
            You can personalize things later.
          </Text>
          <View className="mt-6 flex-row justify-end gap-3">
            <Pressable
              onPress={onCancel}
              disabled={loading}
              className="rounded-full border border-slate-200 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-dad-dark">
                Stay here
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className="rounded-full bg-[#C59A5F] px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">
                {loading ? "Skipping…" : "Skip all"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(createBlankAnswers);
  const [touched, setTouched] = useState<TouchedState>({
    parenting_style: false,
    deescalation_first_move: false,
    legacy_anchor: false,
    priority_help_types: false,
    advice_tone: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [startTimestamp] = useState(() => Date.now());

  const limitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydratedFromSupabase = useRef(false);
  const hasLoadedFromStorage = useRef(false);

  const currentQuestion = ONBOARDING_FLOW[stepIndex];
  const stepNumber = stepIndex + 1;
  const isLastStep = stepIndex === TOTAL_ONBOARDING_STEPS - 1;

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!isActive || !stored) return;

        const parsed = JSON.parse(stored);
        if (parsed.version !== ONBOARDING_VERSION) return;

        const merged: OnboardingAnswers = {
          ...createBlankAnswers(),
          ...parsed,
        };
        if (isActive) {
          setAnswers(merged);
        }
      } catch (error) {
        console.error("Failed to load onboarding answers", error);
      } finally {
        hasLoadedFromStorage.current = true;
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      hasHydratedFromSupabase.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (hasHydratedFromSupabase.current) return;

    hasHydratedFromSupabase.current = true;

    let isActive = true;

    const safeStringArray = (value: unknown): string[] => {
      if (!Array.isArray(value)) return [];
      return value.filter((item): item is string => typeof item === "string");
    };

    const safeString = (value: unknown): string => {
      return typeof value === "string" ? value : "";
    };

    (async () => {
      try {
        const result = await fetchQuizResult();
        if (!isActive || !result) return;

        const version =
          typeof result.version === "number" ? result.version : 0;
        if (version !== ONBOARDING_VERSION) return;

        const hydrated: OnboardingAnswers = {
          ...createBlankAnswers(),
          parenting_style: safeStringArray(result.parenting_style),
          deescalation_first_move: safeString(result.deescalation_first_move),
          legacy_anchor: safeString(result.legacy_anchor),
          priority_help_types: safeStringArray(result.priority_help_types),
          advice_tone: safeStringArray(result.advice_tone),
          completed_at_iso:
            typeof result.completed_at_iso === "string"
              ? result.completed_at_iso
              : undefined,
          version: ONBOARDING_VERSION,
        };

        const isComplete =
          validateMulti(hydrated.parenting_style, 1, MAX_MULTI_SELECTION) &&
          validateShort(hydrated.deescalation_first_move) &&
          validateShort(hydrated.legacy_anchor) &&
          validateMulti(hydrated.priority_help_types, 1, MAX_MULTI_SELECTION) &&
          validateMulti(hydrated.advice_tone, 1, MAX_MULTI_SELECTION);

        if (!isComplete) return;
        if (!isActive) return;

        setAnswers(hydrated);

        try {
          await AsyncStorage.setItem(
            "hd.onboarding.completed",
            JSON.stringify(1)
          );
        } catch (e) {
          console.error("Failed to persist completion flag", e);
        }

        if (onComplete) {
          onComplete();
        }
      } catch (error) {
        console.error("Failed to hydrate onboarding answers", error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, onComplete]);

  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    (async () => {
      try {
        await AsyncStorage.setItem(
          ONBOARDING_STORAGE_KEY,
          JSON.stringify({ ...answers, version: ONBOARDING_VERSION })
        );
      } catch (error) {
        console.error("Failed to persist onboarding answers", error);
      }
    })();
  }, [answers]);

  const showLimitToast = useCallback(() => {
    setLimitMessage("Max two selected.");
    if (limitTimeoutRef.current) {
      clearTimeout(limitTimeoutRef.current);
    }
    limitTimeoutRef.current = setTimeout(() => {
      setLimitMessage(null);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (limitTimeoutRef.current) {
        clearTimeout(limitTimeoutRef.current);
      }
    };
  }, []);

  const isCurrentValid = useMemo(() => {
    if (currentQuestion.type === "multi") {
      const arr = answers[currentQuestion.id];
      return validateMulti(arr, 1, MAX_MULTI_SELECTION);
    }
    const value = answers[currentQuestion.id];
    return validateShort(value);
  }, [answers, currentQuestion]);

  const markTouched = useCallback((key: keyof TouchedState) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const handleSelectOption = useCallback(
    (questionId: MultiQuestionKey, optionId: string) => {
      markTouched(questionId);
      setAnswers((prev) => {
        const existing = prev[questionId] as string[];
        if (existing.includes(optionId)) {
          const updated = existing.filter((v) => v !== optionId);
          return { ...prev, [questionId]: updated };
        }
        if (existing.length >= MAX_MULTI_SELECTION) {
          showLimitToast();
          return prev;
        }
        const updated = [...existing, optionId];
        return { ...prev, [questionId]: updated };
      });
    },
    [markTouched, showLimitToast, stepNumber]
  );

  const handleTextChange = useCallback(
    (questionId: TextQuestionKey, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    []
  );

  const handleTextBlur = useCallback(
    (questionId: TextQuestionKey) => {
      markTouched(questionId);
    },
    [answers, markTouched, stepNumber]
  );

  const handleNext = useCallback(() => {

    if (!isCurrentValid) {
      markTouched(currentQuestion.id);
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, TOTAL_ONBOARDING_STEPS - 1));
  }, [currentQuestion.id, isCurrentValid, markTouched, stepNumber]);

  const handleSuccess = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      await AsyncStorage.setItem("hd.onboarding.completed", JSON.stringify(1));
      await AsyncStorage.setItem(
        "hd.onboarding.addChildCoachmark",
        JSON.stringify(1)
      );
      await AsyncStorage.setItem("hd.onboarding.showUpsell", JSON.stringify(1));
    } catch (e) {
      console.error("Failed to update onboarding completion flags", e);
    }
    setShowSuccess(true);
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, [router, onComplete, showSuccess]);

  const submitAnswers = useCallback(
    async (
      rawAnswers: OnboardingAnswers,
      { trackSubmit }: { trackSubmit: boolean }
    ) => {
      setSubmitting(true);
      setApiError(null);

      const prepared: OnboardingAnswers = {
        ...rawAnswers,
        deescalation_first_move: rawAnswers.deescalation_first_move.trim(),
        legacy_anchor: rawAnswers.legacy_anchor.trim(),
      };

      const completedAtIso =
        rawAnswers.completed_at_iso ?? new Date().toISOString();
      const scored = scoreOnboarding(prepared);
      const quizResult: QuizResultPayload = {
        version: ONBOARDING_VERSION,
        completed_at_iso: completedAtIso,
        parenting_style: [...prepared.parenting_style],
        deescalation_first_move: prepared.deescalation_first_move,
        legacy_anchor: prepared.legacy_anchor,
        priority_help_types: [...prepared.priority_help_types],
        advice_tone: [...prepared.advice_tone],
        computed_archetype: {
          category: scored.category,
          scores: scored.scores,
          version: scored.version,
          source: scored.source,
        },
      };

      const answerPayloads = [
        {
          key: OnboardingKeys.ParentingStyle,
          answer_short: prepared.parenting_style[0] ?? null,
          answer_json: prepared.parenting_style.length
            ? prepared.parenting_style
            : null,
        },
        {
          key: OnboardingKeys.FirstMoveWhenUpset,
          answer_short: prepared.deescalation_first_move || null,
          answer_json: prepared.deescalation_first_move
            ? [prepared.deescalation_first_move]
            : null,
        },
        {
          key: OnboardingKeys.WhatKidsRemember,
          answer_short: prepared.legacy_anchor || null,
          answer_json: prepared.legacy_anchor ? [prepared.legacy_anchor] : null,
        },
        {
          key: OnboardingKeys.HelpFromPocketDad,
          answer_short: prepared.priority_help_types[0] ?? null,
          answer_json: prepared.priority_help_types.length
            ? prepared.priority_help_types
            : null,
        },
        {
          key: OnboardingKeys.PocketDadTone,
          answer_short: prepared.advice_tone[0] ?? null,
          answer_json: prepared.advice_tone.length
            ? prepared.advice_tone
            : null,
        },
      ] as const;

      try {
        if (isAuthenticated) {
          await Promise.all(
            answerPayloads.map(({ key, answer_short, answer_json }) =>
              upsertAnswer(key, {
                answer_short: answer_short ?? null,
                answer_json: answer_json ?? null,
              })
            )
          );

          await finalizeOnboarding(quizResult);
        }


        await handleSuccess();
      } catch (error) {
        console.error("Failed to submit onboarding answers", error);
        setApiError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [handleSuccess, isAuthenticated, startTimestamp]
  );

  const handleSubmit = useCallback(() => {
    if (!isCurrentValid) {
      markTouched(currentQuestion.id);
      return;
    }

    submitAnswers(
      {
        ...answers,
        completed_at_iso: new Date().toISOString(),
        version: ONBOARDING_VERSION,
      },
      { trackSubmit: true }
    );
  }, [
    answers,
    currentQuestion.id,
    isCurrentValid,
    markTouched,
    stepNumber,
    submitAnswers,
  ]);

  const handleSkip = useCallback(() => {
    setShowSkipModal(true);
  }, []);

  const handleSkipConfirm = useCallback(() => {
    setShowSkipModal(false);
    submitAnswers(
      {
        ...DEFAULTS,
        completed_at_iso: new Date().toISOString(),
      },
      { trackSubmit: false }
    );
  }, [submitAnswers]);

  const showError = touched[currentQuestion.id] && !isCurrentValid;

  const renderQuestion = (question: OnboardingQuestion) => {
    if (question.type === "multi") {
      const values = answers[question.id] as string[];

      return (
        <View>
          {question.helperText ? (
            <Text className="text-sm text-slate-600">
              {question.helperText}
            </Text>
          ) : null}
          <View className="mt-4 flex-row flex-wrap gap-3">
            {question.options.map((option) => {
              const selected = values.includes(option.id as never);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelectOption(question.id, option.id)}
                  disabled={submitting || showSuccess}
                  className={`rounded-full border px-4 py-2 ${selected
                    // ? "border-[#C59A5F] bg-[#C59A5F]/90 shadow"
                    ? "border-[#C59A5F] bg-[#C59A5F]/90"
                    : "border-slate-400 bg-white"
                    }`}
                >
                  <Text
                    className={`text-sm font-medium ${selected ? "text-white" : "text-dad-dark"
                      }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {showError && (
            <Text className="mt-4 text-sm font-medium text-red-600">
              {errorCopy.multi}
            </Text>
          )}
        </View>
      );
    }

    const value = answers[question.id] as string;
    const trimmedLength = value.trim().length;

    return (
      <View>
        {question.helperText ? (
          <Text className="text-sm text-slate-600">
            {question.helperText}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={(text) => handleTextChange(question.id, text)}
          onBlur={() => handleTextBlur(question.id)}
          maxLength={160}
          multiline
          numberOfLines={4}
          placeholder={question.placeholder}
          editable={!submitting && !showSuccess}
          textAlignVertical="top"
          className="mt-4 w-full rounded-2xl border border-slate-400 bg-white/90 p-4 text-base text-dad-dark"
        />
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-xs text-slate-600">
            {trimmedLength} / 160
          </Text>
        </View>
        {showError && (
          <Text className="mt-4 text-sm font-medium text-red-600">
            {errorCopy.text}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gradient-warm">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="mx-auto flex-1 w-full max-w-5xl px-4 py-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Step {stepNumber} of {TOTAL_ONBOARDING_STEPS}
            </Text>
            <Pressable
              onPress={handleSkip}
              disabled={submitting || showSuccess}
              className="rounded-full border border-white/40 px-4 py-1.5"
            >
              <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                Skip all
              </Text>
            </Pressable>
          </View>

          <View className="relative flex-1 items-center justify-center py-8">
            {limitMessage && (
              <View className="absolute top-4 rounded-full bg-black/70 px-4 py-2">
                <Text className="text-sm font-medium text-white">
                  {limitMessage}
                </Text>
              </View>
            )}

            {apiError && !showSuccess && (
              <View className="absolute top-4">
                <View className="rounded-full bg-red-600/90 px-4 py-2">
                  <Text className="text-sm font-semibold text-white">
                    {apiError}
                  </Text>
                </View>
              </View>
            )}

            <ScrollView
              className="w-full"
              contentContainerStyle={{ alignItems: "center" }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ paddingTop: 80 }} className="w-full max-w-3xl">
                <View className="overflow-hidden rounded-3xl bg-white/95 p-6 sm:p-10">
                  {showSuccess ? (
                    <View className="items-center">
                      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#C59A5F]/20">
                        <Ionicons
                          name="checkmark"
                          size={28}
                          color="#C59A5F"
                        />
                      </View>
                      <Text className="mt-6 text-center text-2xl font-semibold text-dad-dark">
                        Dialed in. Pocket Dad will match your style.
                      </Text>
                      <Text className="mt-3 text-center text-sm text-slate-600">
                        {onComplete
                          ? "Launching Pocket Dad…"
                          : "Taking you to your dashboard…"}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View>
                        <Text className="text-2xl font-semibold text-dad-dark sm:text-3xl">
                          {currentQuestion.title}
                        </Text>
                        <Text className="mt-2 text-sm text-slate-600 sm:text-base">
                          {currentQuestion.subtitle}
                        </Text>
                      </View>

                      <View className="mt-6 sm:mt-8">
                        {renderQuestion(currentQuestion)}
                      </View>

                      <View className="mt-10 flex-row items-center justify-between">
                        <Pressable
                          onPress={() =>
                            setStepIndex((prev) => Math.max(prev - 1, 0))
                          }
                          disabled={stepIndex === 0 || submitting}
                          className="rounded-full border border-slate-200 px-5 py-2"
                        >
                          <Text className="text-sm font-semibold text-dad-dark">
                            Back
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={isLastStep ? handleSubmit : handleNext}
                          disabled={!isCurrentValid || submitting}
                          className="rounded-full bg-[#C59A5F] px-6 py-2"
                        >
                          <Text className="text-sm font-semibold text-white">
                            {submitting
                              ? "Saving…"
                              : isLastStep
                                ? "Finish setup"
                                : "Next"}
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>

                {!showSuccess && (
                  <Text className="mt-6 text-center text-xs text-white/50">
                    Five quick questions keep Pocket Dad tuned to you.
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      <SkipConfirmModal
        visible={showSkipModal}
        onCancel={() => setShowSkipModal(false)}
        onConfirm={handleSkipConfirm}
        loading={submitting}
      />
    </View>
  );
};

export default Onboarding;
