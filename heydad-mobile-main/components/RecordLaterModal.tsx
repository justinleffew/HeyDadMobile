import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export type UnlockType = "milestone" | "date" | "age";

type RecordLaterModalProps = {
  open: boolean;
  onClose: () => void;
  defaultTitle: string;
  defaultMilestone: string;
  onConfirm: (payload: {
    title: string;
    unlockType: UnlockType;
    unlockValue: string;
  }) => Promise<void> | void;
};

const { width } = Dimensions.get('window')

export default function RecordLaterModal({
  open,
  onClose,
  defaultTitle,
  defaultMilestone,
  onConfirm,
}: RecordLaterModalProps) {
  const [title, setTitle] = useState("");
  const [unlockType, setUnlockType] = useState<UnlockType>("milestone");
  const [unlockValue, setUnlockValue] = useState(defaultMilestone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setUnlockType("milestone");
      setUnlockValue(defaultMilestone);
      setError(null);
    }
  }, [open, defaultTitle, defaultMilestone]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (unlockType === "milestone" && !unlockValue.trim()) {
      setError("Add a milestone or switch to a date/age unlock.");
      return;
    }

    if (unlockType === "date" && !unlockValue) {
      setError("Pick a date to unlock.");
      return;
    }

    if (unlockType === "age" && !unlockValue) {
      setError("Add the age in years.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm({
        title: title.trim(),
        unlockType,
        unlockValue: unlockValue.trim(),
      });
      onClose();
    } catch (confirmError) {
      console.error(confirmError);
      setError("We couldn't save that prompt. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-4">
        <KeyboardAvoidingView
          style={{ paddingHorizontal: 10 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center px-4"
        >
          <View
            style={{ width: width * .90 }}
            className="max-h-[90%] "
          >
            <View className="w-full max-w-lg self-center rounded-3xl bg-white p-6 shadow-2xl">
              <Text className="text-2xl font-serif font-semibold text-slate-600">
                Record later
              </Text>
              <Text className="mt-1 text-sm text-slate-600">
                Pocket Dad will remind you to record this message when the
                moment is right.
              </Text>

              <View className="mt-6 space-y-4">
                {/* Title */}
                <View>
                  <Text className="text-sm font-semibold text-slate-500">
                    Title
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Give this message a title"
                    placeholderTextColor="#9ca3af"
                    className="mt-2 w-full justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-500"
                  />
                </View>

                <View style={{ marginTop: 4 }} className="space-y-3">
                  <Text style={{ marginVertical: 6 }} className="text-sm font-semibold text-slate-500">
                    Unlock when
                  </Text>

                  <RadioOption
                    checked={unlockType === "milestone"}
                    label="Milestone"
                    description="Pick a milestone or moment"
                    onPress={() => {
                      setUnlockType("milestone");
                      setUnlockValue((value) => value || defaultMilestone);
                    }}
                  />
                  <RadioOption
                    checked={unlockType === "date"}
                    label="Specific date"
                    description="Unlock on the date you pick"
                    onPress={() => {
                      setUnlockType("date");
                      setUnlockValue("");
                    }}
                  />
                  {unlockType === "date" ? (
                    <TextInput
                      value={unlockValue}
                      onChangeText={setUnlockValue}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                      className="w-full rounded-xl border border-slate-100 bg-white px-3 py-3 text-base text-slate-500"
                    />
                  ) : null}

                  <RadioOption
                    checked={unlockType === "age"}
                    label="Age"
                    description="Unlock when they reach this age"
                    onPress={() => {
                      setUnlockType("age");
                      setUnlockValue("");
                    }}
                  />
                  {unlockType === "age" ? (
                    <TextInput
                      value={unlockValue}
                      onChangeText={setUnlockValue}
                      keyboardType="number-pad"
                      placeholder="Age in years"
                      placeholderTextColor="#9ca3af"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-500"
                    />
                  ) : null}
                </View>

                {error ? (
                  <Text className="text-sm text-rose-600" accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}

                <View className="flex-row justify-end gap-3 pt-2">
                  <TouchableOpacity
                    onPress={onClose}
                    disabled={isSubmitting}
                    className="rounded-full border border-slate-200 px-4 py-2"
                  >
                    <Text className="text-sm font-semibold text-slate-500">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    className={`rounded-full bg-dad-gold px-4 py-2 ${isSubmitting ? "opacity-60" : ""
                      }`}
                  >
                    <Text className="text-sm font-semibold text-black">
                      {isSubmitting ? "Saving…" : "Record 30–60 sec"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type RadioOptionProps = {
  checked: boolean;
  label: string;
  description: string;
  onPress: () => void;
};

function RadioOption({ checked, label, description, onPress }: RadioOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`mb-2 flex-row items-center justify-between rounded-2xl border p-3 ${checked ? "border-amber-500 bg-amber-50" : "border-slate-200"
        }`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold text-slate-500">{label}</Text>
        <Text className="text-sm text-slate-500">{description}</Text>
      </View>
      <View className="h-5 w-5 items-center justify-center">
        <View className="h-5 w-5 rounded-full border border-slate-200 items-center justify-center">
          {checked ? <View className="h-3 w-3 rounded-full bg-amber-400" /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
