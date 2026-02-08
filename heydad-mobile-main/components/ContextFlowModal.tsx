import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export type ContextOption = {
  value: string;
  label: string;
  description?: string;
};

export type ContextAnswers = {
  location: string | null;
  urgency: string | null;
  triedStrategies: string[];
};

export type ContextStep = {
  id: string;
  title: string;
  description?: string;
  multiSelect?: boolean;
  options: ContextOption[];
};

type ContextFlowModalProps = {
  open: boolean;
  steps: ContextStep[];
  activeStep: number;
  answers: ContextAnswers;
  pendingPrompt: string | null;
  onOptionToggle: (stepId: string, value: string, multiSelect: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
};

export default function ContextFlowModal({
  open,
  steps,
  activeStep,
  answers,
  pendingPrompt,
  onOptionToggle,
  onNext,
  onBack,
  onClose,
  onComplete,
  onSkip,
}: ContextFlowModalProps) {
  const clampedStepIndex = Math.min(
    Math.max(activeStep, 0),
    Math.max(steps.length - 1, 0)
  );

  const currentStep = steps[clampedStepIndex];
  const isLastStep = clampedStepIndex === steps.length - 1;
  const showBack = clampedStepIndex > 0;

  const selectedValues = useMemo(() => {
    if (!currentStep) return new Set<string>();

    if (currentStep.multiSelect || currentStep.id === "triedStrategies") {
      return new Set(answers.triedStrategies ?? []);
    }

    if (currentStep.id === "location") {
      return answers.location ? new Set([answers.location]) : new Set<string>();
    }

    if (currentStep.id === "urgency") {
      return answers.urgency ? new Set([answers.urgency]) : new Set<string>();
    }

    return new Set<string>();
  }, [answers.location, answers.triedStrategies, answers.urgency, currentStep]);

  const hasSelection = selectedValues.size > 0;
  const primaryDisabled =
    !currentStep ||
    (!hasSelection && !(currentStep.multiSelect || currentStep.id === "triedStrategies"));
  const primaryLabel = isLastStep ? "Use this context" : "Next";

  if (!open) return null;

  const handlePrimary = () => {
    if (!currentStep) return;
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  const handleOptionClick = (value: string) => {
    if (!currentStep) return;
    onOptionToggle(
      currentStep.id,
      value,
      Boolean(currentStep.multiSelect || currentStep.id === "triedStrategies")
    );
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center px-4 py-8">
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0 bg-black/60" />
        </TouchableWithoutFeedback>

        <View className="relative z-10 w-full max-w-2xl self-center overflow-hidden rounded-3xl bg-[#0F1720] shadow-2xl">
          <ScrollView
            className="h-[100%]"
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              onPress={onClose}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              Context boost
            </Text>

            <Text
              className="mt-2 text-2xl font-serif text-white"
            >
              {currentStep?.title ?? "Add context"}
            </Text>

            <Text className="mt-2 text-sm text-white/70">
              Step {clampedStepIndex + 1} of {steps.length}
            </Text>

            {currentStep?.description ? (
              <Text className="mt-4 text-sm leading-relaxed text-white/70">
                {currentStep.description}
              </Text>
            ) : null}

            {pendingPrompt ? (
              <View className="mt-5 rounded-2xl bg-white/5 p-4">
                <Text className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Your prompt
                </Text>
                <Text className="mt-2 text-sm leading-relaxed text-white/80">
                  {pendingPrompt}
                </Text>
              </View>
            ) : null}

            <View className="mt-6 space-y-3">
              {currentStep?.options.map((option) => {
                const selected = selectedValues.has(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.8}
                    onPress={() => handleOptionClick(option.value)}
                    className={`mb-4 group relative w-full rounded-2xl border px-5 py-4 text-left ${selected
                      ? "border-[#C59A5F] bg-[#C59A5F]/15"
                      : "border-white/10 bg-white/5"
                      }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${selected
                          ? "border-[#C59A5F] bg-[#C59A5F]"
                          : "border-white/20 bg-transparent"
                          }`}
                      >
                        {selected ? (
                          <Feather
                            name="check"
                            size={16}
                            color={selected ? "#0F1720" : "transparent"}
                          />
                        ) : null}
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-white">
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text className="mt-1 text-xs text-white/70">
                            {option.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <View className="flex-row gap-3">
                {showBack ? (
                  <TouchableOpacity
                    onPress={onBack}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 px-4"
                  >
                    <Text className="text-sm font-medium text-white/80">
                      Back
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={handlePrimary}
                  disabled={primaryDisabled}
                  className={`inline-flex min-h-10 items-center justify-center rounded-full bg-[#C59A5F] px-5 ${primaryDisabled ? "opacity-60" : ""
                    }`}
                >
                  <Text className="text-sm font-semibold uppercase tracking-wide text-[#0F1720]">
                    {primaryLabel}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onSkip}>
                <Text className="text-sm font-medium text-white/60 underline-offset-4">
                  Just give me advice
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
