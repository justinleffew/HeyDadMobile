import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";

export type PivotFlowOption = {
  id: string;
  title: string;
  description: string;
};

export type PivotFlowConfig = {
  title: string;
  description: string;
  options: PivotFlowOption[];
  skipLabel: string;
};

type PivotModalProps = {
  open: boolean;
  flow: PivotFlowConfig;
  selectedOptionId: string | null;
  onClose: () => void;
  onSelect: (optionId: string) => void;
};

export default function PivotModal({
  open,
  flow,
  selectedOptionId,
  onClose,
  onSelect,
}: PivotModalProps) {
  if (!open) return null;

  const handleSelect = (optionId: string) => {
    onSelect(optionId);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center bg-[#0f1625]/90 px-4 py-10">
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0" />
        </TouchableWithoutFeedback>

        <View
          className="w-full max-w-md self-center rounded-3xl bg-white p-6 text-slate-600 shadow-2xl"
          accessible
          accessibilityRole="dialog"
          accessibilityLabel={flow.title}
          accessibilityHint={flow.description}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <Text className="text-2xl font-serif font-semibold">
              {flow.title}
            </Text>
            <Text className="mt-2 text-sm text-slate-400">
              {flow.description}
            </Text>

            <View className="mt-6 space-y-3">
              {flow.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => handleSelect(option.id)}
                    className={`w-full mb-2 rounded-2xl border p-4 text-left transition ${isSelected
                      ? "border-amber-500 bg-amber-200"
                      : "border-slate-300 bg-white/90"
                      }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text className="text-base font-semibold">
                      {option.title}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-400">
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-slate-700">
                {flow.skipLabel}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
