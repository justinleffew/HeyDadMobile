import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface HowItWorksModalProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  "Pick the child at the top.",
  "Describe what’s happening (1–2 lines).",
  "Tap Engage Dad Brain.",
  "Adjust with Softer / Funnier / Shorter.",
  "Record, Text, or Edit.",
];

export default function HowItWorksModal({ open, onClose }: HowItWorksModalProps) {
  if (!open) return null;

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="rounded-md flex-1 items-center justify-center px-4 py-8">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
        />

        <View
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-[530px] overflow-hidden rounded-2xl bg-[#0F1720] shadow-xl ring-1 ring-white/10"
        >
          <ScrollView
            className="max-h-[98vh] p-6"
            bounces={false}
          >
            <Pressable
              onPress={onClose}
              style={{ zIndex: 2 }}
              className="absolute right-0 -top-2 flex h-12 w-12 items-center justify-center rounded-full text-[#A0A0A0]"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={20} color="#A0A0A0" />
            </Pressable>

            <Text
              className="text-2xl font-serif text-[#F5F5F5]"
            >
              How Pocket Dad Works
            </Text>

            <Text className="mt-4 text-sm leading-relaxed text-[#F5F5F5]/80">
              Pocket Dad helps you think it through before you talk. It turns your quick
              context into a calm, supportive message you can say right now.
            </Text>

            <View className="mt-6 space-y-3">
              {steps.map((step, index) => (
                <View key={step} className="flex flex-row gap-3">
                  <View className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#C59A5F]/10">
                    <Text className="text-xs font-semibold text-[#C59A5F]">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="text-sm text-[#F5F5F5]/80">{step}</Text>
                </View>
              ))}
            </View>

            <View className="mt-6 space-y-5">
              <View className="rounded-xl bg-white/5 p-5 ring-1 ring-white/10">
                <Text className="text-sm font-semibold uppercase tracking-wide text-[#C59A5F]">
                  It learns from you.
                </Text>
                <Text className="mt-3 text-sm leading-relaxed text-[#F5F5F5]/80">
                  Pocket Dad adapts to your style — your words, tone, and Dad Mode
                  preferences. The more you use it, the more it sounds like you.
                </Text>
              </View>

              <View className="mt-3 rounded-xl bg-white/5 p-5 ring-1 ring-white/10">
                <Text className="text-sm font-semibold uppercase tracking-wide text-[#F5F5F5]/80">
                  What it remembers
                </Text>
                <View className="mt-3 space-y-2">
                  <Text className="text-sm text-[#F5F5F5]/80">
                    • Your Dad Mode balance (Patience • Growth • Calm).
                  </Text>
                  <Text className="text-sm text-[#F5F5F5]/80">
                    • Which refinements you use most.
                  </Text>
                  <Text className="text-sm text-[#F5F5F5]/80">
                    • Common phrases you edit or keep.
                  </Text>
                  <Text className="text-sm text-[#F5F5F5]/80">
                    • Per-child context (age, name, pronouns).
                  </Text>
                </View>
                <Text className="mt-3 text-xs text-[#A0A0A0]">
                  Private to your account. You can clear it anytime in Settings.
                </Text>
              </View>
            </View>

            <Text className="mt-6 text-xs uppercase tracking-wide text-[#A0A0A0]">
              Tip: Specific context (who, when, what happened) = better output.
            </Text>

            <Pressable
              onPress={onClose}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#C59A5F] px-4 shadow"
            >
              <Text className="text-sm font-semibold text-white">
                Got it
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
