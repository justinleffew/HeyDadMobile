import {
  Modal,
  View,
  Text,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface PocketDadSignupModalProps {
  open: boolean;
  onClose: () => void;
}

const PocketDadSignupModal = ({ open, onClose }: PocketDadSignupModalProps) => {
  const router = useRouter();

  if (!open) return null;

  const goToSignup = () => {
    onClose();
    router.push("/signup");
  };

  const goToLogin = () => {
    onClose();
    router.push("/login");
  };

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-[#0f1625]/90 px-4 py-10">
        {/* Card */}
        <View className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#141d2e] p-8 text-white shadow-strong">
          {/* Close button */}
          <Pressable
            onPress={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
            accessibilityRole="button"
            accessibilityLabel="Close sign up prompt"
          >
            <Feather name="x" size={18} color="#FFFFFF" />
          </Pressable>

          <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
            Pocket Dad
          </Text>

          <Text className="mt-4 text-2xl font-serif font-semibold text-white">
            Unlock Pocket Dad
          </Text>

          <Text className="mt-3 text-sm text-white/70">
            Sign up to ask your first question and get a customized response from Pocket Dad.
            Members get instant scripts tailored to their family.
          </Text>

          <View className="mt-6 space-y-3">
            <Pressable
              onPress={goToSignup}
              className="w-full rounded-xl bg-[#C59A5F] px-5 py-3 shadow-lg"
            >
              <Text className="text-center text-base font-semibold uppercase tracking-wide text-[#0f1625]">
                Start your free trial
              </Text>
            </Pressable>

            <Pressable
              onPress={goToLogin}
              className="w-full rounded-xl border border-white/20 px-5 py-3"
            >
              <Text className="text-center text-base font-semibold text-white">
                Log in
              </Text>
            </Pressable>
          </View>

          <Text className="mt-4 text-xs text-white/40">
            Already a member? Log in to continue the conversation.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default PocketDadSignupModal;
