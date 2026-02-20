import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from 'utils/supabase';

const CODE_LENGTH = 6;
const KIDS_SESSION_KEY = 'kids_session';

export default function KidsCodeEntryScreen() {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const handleCodeChange = (text: string, index: number) => {
    const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length === 0) {
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      setError('');
      return;
    }

    // Handle paste of full code
    if (normalized.length > 1) {
      const chars = normalized.slice(0, CODE_LENGTH).split('');
      const newCode = Array(CODE_LENGTH).fill('');
      chars.forEach((char, i) => {
        newCode[i] = char;
      });
      setCode(newCode);
      setError('');
      if (chars.length >= CODE_LENGTH) {
        inputRefs.current[CODE_LENGTH - 1]?.blur();
        validateCode(newCode.join(''));
      } else {
        inputRefs.current[chars.length]?.focus();
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = normalized;
    setCode(newCode);
    setError('');

    // Auto-advance
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    const fullCode = newCode.join('');
    if (fullCode.length === CODE_LENGTH && newCode.every(c => c !== '')) {
      inputRefs.current[CODE_LENGTH - 1]?.blur();
      validateCode(fullCode);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && code[index] === '' && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateCode = async (fullCode: string) => {
    setLoading(true);
    setError('');

    const trimmedCode = fullCode.trim().toUpperCase();
    console.log('[KidsCode] Validating code:', JSON.stringify(trimmedCode));

    try {
      // Use RPC function to bypass RLS — the children table blocks anon SELECT,
      // but the validate_kid_code function uses SECURITY DEFINER to access it.
      const { data, error: rpcError } = await supabase.rpc('validate_kid_code', {
        code_input: trimmedCode,
      });

      console.log('[KidsCode] RPC response:', JSON.stringify({ data, error: rpcError }));

      if (rpcError) {
        console.error('[KidsCode] RPC error:', rpcError.code, rpcError.message, rpcError.details);
        setError('Something went wrong. Please try again.');
        triggerShake();
        setCode(Array(CODE_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
        return;
      }

      // RPC returns an array of rows — take the first match
      const child = Array.isArray(data) ? data[0] : data;

      if (!child) {
        setError("That code didn't work. Try again!");
        triggerShake();
        setCode(Array(CODE_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
        return;
      }

      console.log('[KidsCode] Found child:', child.kid_name, child.kid_id);

      // Store kid session in AsyncStorage
      await AsyncStorage.setItem(
        KIDS_SESSION_KEY,
        JSON.stringify({
          childId: child.kid_id,
          childName: child.kid_name,
          parentId: child.parent_id,
          birthdate: child.birthdate,
        }),
      );

      // Navigate to the kids feed
      router.replace('/kids/feed');
    } catch (err) {
      console.error('[KidsCode] Unexpected error:', err);
      setError('Something went wrong. Please try again.');
      triggerShake();
      setCode(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 400);
  }, []);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        <View className="flex-1 px-6">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-14 mb-6 flex-row items-center"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
            <Text className="ml-2 text-slate-700 text-base">Back to Login</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View className="items-center mb-8">
            <View className="rounded-xl bg-slate-800 items-center justify-center">
              <Image
                className="w-16 h-16 rounded-xl"
                source={require('../../assets/logo.png')}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Header */}
          <Text className="text-center text-2xl font-merriweather text-slate-800 mb-2">
            Enter Your Code
          </Text>
          <Text className="text-center text-base text-gray-500 mb-10 leading-6">
            Ask your dad for your special code
          </Text>

          {/* Code Input */}
          <Animated.View style={shakeStyle}>
            <View className="flex-row justify-center" style={{ gap: 8 }}>
              {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  value={code[index]}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  maxLength={index === 0 ? CODE_LENGTH : 1}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="default"
                  selectTextOnFocus
                  style={{
                    width: 48,
                    height: 58,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: code[index]
                      ? '#c4a471'
                      : error
                        ? '#ef4444'
                        : '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    fontSize: 22,
                    fontWeight: '700',
                    textAlign: 'center',
                    color: '#1e293b',
                  }}
                />
              ))}
            </View>
          </Animated.View>

          {/* Error Message */}
          {error ? (
            <Text className="text-center text-red-500 text-sm mt-4 font-medium">
              {error}
            </Text>
          ) : null}

          {/* Loading */}
          {loading ? (
            <View className="flex-row justify-center items-center mt-6">
              <ActivityIndicator size="small" color="#c4a471" />
              <Text className="ml-2 text-gray-500 text-sm">Checking code...</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
