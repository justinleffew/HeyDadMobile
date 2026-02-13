import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  onPress: () => void;
};

export default function QuickRecordFAB({ onPress }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Subtle pulse loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 24,
        right: 20,
        zIndex: 50,
        transform: [
          { scale: Animated.multiply(scale, pulseAnim) },
        ],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Quick Record"
        accessibilityHint="Start recording immediately without a prompt"
      >
        <LinearGradient
          colors={['#C2A16C', '#D4B996', '#C2A16C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#C2A16C',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Ionicons name="mic" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
