import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STARTER_PROMPTS } from '../data/starterPrompts';

type Props = {
  visible: boolean;
  onRecord: (promptText: string) => void;
  onDismiss: () => void;
};

export default function FirstRecordingNudge({
  visible,
  onRecord,
  onDismiss,
}: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const firstPrompt = STARTER_PROMPTS[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          opacity,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale }],
            width: '100%',
            maxWidth: 400,
          }}
        >
          <View
            style={{
              backgroundColor: '#0F172A',
              borderRadius: 24,
              padding: 28,
              borderWidth: 1,
              borderColor: 'rgba(194, 161, 108, 0.3)',
            }}
          >
            {/* Emoji header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: 'rgba(194, 161, 108, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="mic" size={32} color="#D4B996" />
              </View>

              <Text
                style={{
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: '700',
                  textAlign: 'center',
                  fontFamily: 'Merriweather_700Bold',
                  lineHeight: 30,
                }}
              >
                {"Let's do your first one together"}
              </Text>

              <Text
                style={{
                  color: '#94A3B8',
                  fontSize: 15,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 22,
                }}
              >
                Takes 30 seconds. Your kids will love this one.
              </Text>
            </View>

            {/* Suggested prompt card */}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>
                {firstPrompt.emoji}
              </Text>
              <Text
                style={{
                  color: '#E2E8F0',
                  fontSize: 16,
                  fontWeight: '500',
                  lineHeight: 23,
                  fontFamily: 'Merriweather_400Regular',
                }}
              >
                {firstPrompt.text}
              </Text>
            </View>

            {/* Record CTA */}
            <TouchableOpacity
              onPress={() => onRecord(firstPrompt.text)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start your first recording"
            >
              <LinearGradient
                colors={['#D4B996', '#C2A16C', '#D4B996']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  borderRadius: 14,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="mic" size={20} color="#fff" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  {"Let's Record This"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity
              onPress={onDismiss}
              activeOpacity={0.7}
              style={{
                alignItems: 'center',
                paddingVertical: 14,
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  color: '#64748B',
                  fontSize: 14,
                }}
              >
                {"I'll do this later"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
