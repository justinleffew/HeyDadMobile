import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../providers/ThemeProvider';
import { PromptCard, usePromptProgress } from '../hooks/usePromptProgress';

type Props = {
  onRecord: (promptText: string) => void;
  onBrowseAll: () => void;
};

const CARD_DARK_BG = 'rgba(31, 41, 55, 0.85)';
const CARD_LIGHT_BG = 'rgba(255, 255, 255, 0.9)';
const GOLD = '#C2A16C';
const GOLD_LIGHT = '#D4B996';
const GREEN_CHECK = '#22C55E';

function MilestoneToast({
  count,
  onDismiss,
}: {
  count: number;
  onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(onDismiss);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const messages: Record<number, string> = {
    5: "5 recordings! You're building something incredible.",
    10: "10 recordings! Your kids are going to treasure these.",
    25: '25 recordings! You are an absolute legend.',
    50: '50! Your family vault is legendary.',
    75: '75 recordings. Hall of Fame dad.',
    100: '100 recordings. Your legacy is cemented forever.',
  };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }],
        position: 'absolute',
        top: -60,
        left: 0,
        right: 0,
        zIndex: 100,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: '#1E293B',
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: GOLD,
          shadowColor: GOLD,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 20, textAlign: 'center' }}>
          {'\u{1F389}'} {'\u{1F525}'}
        </Text>
        <Text
          style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {messages[count] || `${count} recordings! Keep going!`}
        </Text>
      </View>
    </Animated.View>
  );
}

function AnimatedCard({
  card,
  index,
  isDark,
  isCompleted,
  onRecord,
  onDone,
  onSkip,
}: {
  card: PromptCard;
  index: number;
  isDark: boolean;
  isCompleted: boolean;
  onRecord: () => void;
  onDone: () => void;
  onSkip: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
    translateX.setValue(50);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [card.id]);

  const cardBg = isDark ? CARD_DARK_BG : CARD_LIGHT_BG;
  const borderColor = isCompleted
    ? GREEN_CHECK
    : isDark
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <Animated.View
      style={{
        transform: [{ translateX }, { scale }],
        opacity,
        marginBottom: 12,
      }}
    >
      <Pressable
        onPressIn={() => {
          Animated.spring(scale, {
            toValue: 0.98,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }}
        onPress={onRecord}
        accessibilityRole="button"
        accessibilityLabel={`Record: ${card.text}`}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor,
            padding: 16,
            shadowColor: isDark ? '#000' : '#64748B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {/* Top row: emoji + tier badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24 }}>{card.emoji}</Text>
              {card.tier === 'starter' && (
                <View
                  style={{
                    backgroundColor: `${GOLD}20`,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      color: GOLD,
                      fontSize: 10,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Starter
                  </Text>
                </View>
              )}
            </View>

            {isCompleted && (
              <View
                style={{
                  backgroundColor: `${GREEN_CHECK}20`,
                  borderRadius: 20,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark-circle" size={22} color={GREEN_CHECK} />
              </View>
            )}
          </View>

          {/* Prompt text */}
          <Text
            style={{
              color: textColor,
              fontSize: 16,
              fontWeight: '500',
              lineHeight: 23,
              fontFamily: 'Merriweather_400Regular',
              marginBottom: 14,
            }}
          >
            {card.text}
          </Text>

          {/* Action buttons */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Record button */}
            <TouchableOpacity
              onPress={onRecord}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Record now: ${card.text}`}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={isCompleted ? ['#22C55E', '#16A34A'] : [GOLD_LIGHT, GOLD, GOLD_LIGHT]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  borderRadius: 12,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Ionicons
                  name={isCompleted ? 'checkmark-circle' : 'mic'}
                  size={16}
                  color="#fff"
                />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {isCompleted ? 'Recorded' : 'Record Now'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Done toggle */}
            {!isCompleted && (
              <TouchableOpacity
                onPress={onDone}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Mark as done"
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={subtextColor}
                />
              </TouchableOpacity>
            )}

            {/* Skip button */}
            {!isCompleted && (
              <TouchableOpacity
                onPress={onSkip}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Skip this prompt"
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={subtextColor}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function PromptCards({ onRecord, onBrowseAll }: Props) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const {
    loaded,
    completedCount,
    totalPrompts,
    streakCount,
    streakWeeks,
    currentMilestone,
    markCompleted,
    markSkipped,
    isCompleted,
    getVisibleCards,
    getRefreshedCards,
  } = usePromptProgress();

  const [cards, setCards] = useState<PromptCard[]>([]);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneValue, setMilestoneValue] = useState<number | null>(null);

  // Initialize cards when loaded
  useEffect(() => {
    if (loaded) {
      setCards(getVisibleCards());
    }
  }, [loaded, getVisibleCards]);

  // Milestone detection
  useEffect(() => {
    if (currentMilestone && currentMilestone !== milestoneValue) {
      setMilestoneValue(currentMilestone);
      setShowMilestone(true);
    }
  }, [currentMilestone, milestoneValue]);

  const handleRecord = useCallback(
    (card: PromptCard) => {
      onRecord(card.text);
    },
    [onRecord]
  );

  const handleDone = useCallback(
    (card: PromptCard) => {
      markCompleted(card.id);
      // Replace this card with a new one
      setTimeout(() => {
        setCards((prev) => {
          const updated = prev.filter((c) => c.id !== card.id);
          const refreshed = getRefreshedCards(updated);
          // If we lost a card, get a fresh set
          if (refreshed.length < 4) {
            return getVisibleCards();
          }
          return refreshed;
        });
      }, 300);
    },
    [markCompleted, getRefreshedCards, getVisibleCards]
  );

  const handleSkip = useCallback(
    (card: PromptCard) => {
      markSkipped(card.id);
      setTimeout(() => {
        setCards((prev) => {
          const updated = prev.filter((c) => c.id !== card.id);
          const refreshed = getRefreshedCards(updated);
          if (refreshed.length < 4) {
            return getVisibleCards();
          }
          return refreshed;
        });
      }, 200);
    },
    [markSkipped, getRefreshedCards, getVisibleCards]
  );

  const handleRefresh = useCallback(() => {
    setCards((prev) => getRefreshedCards(prev));
  }, [getRefreshedCards]);

  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';

  if (!loaded) return null;

  return (
    <View style={{ marginBottom: 24, position: 'relative' }}>
      {showMilestone && milestoneValue && (
        <MilestoneToast
          count={milestoneValue}
          onDismiss={() => setShowMilestone(false)}
        />
      )}

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <View>
          <Text
            style={{
              color: textColor,
              fontSize: 20,
              fontWeight: '700',
              fontFamily: 'Merriweather_700Bold',
            }}
          >
            Story Prompts
          </Text>
          <Text
            style={{
              color: subtextColor,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {completedCount} of {totalPrompts}+ prompts completed
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Show different prompts"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="shuffle" size={16} color={subtextColor} />
          <Text style={{ color: subtextColor, fontSize: 12, fontWeight: '600' }}>
            Shuffle
          </Text>
        </TouchableOpacity>
      </View>

      {/* Streak indicator */}
      {streakWeeks > 1 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 12,
            backgroundColor: isDark ? 'rgba(234, 88, 12, 0.12)' : 'rgba(234, 88, 12, 0.08)',
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 14 }}>{'\u{1F525}'}</Text>
          <Text
            style={{
              color: '#EA580C',
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {streakWeeks} weeks in a row
          </Text>
        </View>
      )}

      {/* Nudge for inactive dads */}
      {completedCount === 0 && (
        <View
          style={{
            backgroundColor: isDark ? 'rgba(194, 161, 108, 0.1)' : 'rgba(194, 161, 108, 0.08)',
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            borderLeftWidth: 3,
            borderLeftColor: GOLD,
          }}
        >
          <Text
            style={{
              color: isDark ? '#D4B996' : '#92702A',
              fontSize: 14,
              fontWeight: '500',
              lineHeight: 20,
            }}
          >
            Even 30 seconds matters. Your kids will treasure hearing your voice.
          </Text>
        </View>
      )}

      {/* Cards */}
      {cards.map((card, index) => (
        <AnimatedCard
          key={card.id}
          card={card}
          index={index}
          isDark={isDark}
          isCompleted={isCompleted(card.id)}
          onRecord={() => handleRecord(card)}
          onDone={() => handleDone(card)}
          onSkip={() => handleSkip(card)}
        />
      ))}

      {/* See all prompts link */}
      <TouchableOpacity
        onPress={onBrowseAll}
        activeOpacity={0.7}
        accessibilityRole="link"
        accessibilityLabel="See all prompts"
        style={{
          alignItems: 'center',
          paddingVertical: 12,
          marginTop: 4,
        }}
      >
        <Text
          style={{
            color: GOLD,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          See all prompts {'\u2192'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
