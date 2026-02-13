import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STARTER_PROMPTS, StarterPrompt } from '../data/starterPrompts';
import { VIDEO_PROMPTS } from '../constants';

const STORAGE_KEY = 'hd.prompt.progress.v1';

export type PromptCard = {
  id: string;
  emoji: string;
  text: string;
  tier: 'starter' | 'library';
  priority: boolean;
  order: number;
};

type PromptState = {
  completed: string[];
  skipped: string[];
  lastRecordDate: string | null;
  streakCount: number;
  streakWeeks: number;
  lastStreakWeek: string | null;
};

const DEFAULT_STATE: PromptState = {
  completed: [],
  skipped: [],
  lastRecordDate: null,
  streakCount: 0,
  streakWeeks: 0,
  lastStreakWeek: null,
};

const LIBRARY_EMOJIS = [
  '\u{1F3AC}', '\u{1F4DD}', '\u{1F3A4}', '\u{1F4AC}', '\u{1F4A1}',
  '\u{1F30D}', '\u{1F3C6}', '\u{1F9E0}', '\u{1F46A}', '\u{2728}',
];

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function toLibraryCard(text: string, index: number): PromptCard {
  return {
    id: `library-${index}`,
    emoji: LIBRARY_EMOJIS[index % LIBRARY_EMOJIS.length],
    text,
    tier: 'library',
    priority: false,
    order: 1000 + index,
  };
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function usePromptProgress() {
  const [state, setState] = useState<PromptState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({ ...DEFAULT_STATE, ...parsed });
        }
      } catch (e) {
        console.error('Failed to load prompt progress', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.error('Failed to save prompt progress', e)
    );
  }, [state, loaded]);

  const markCompleted = useCallback((promptId: string) => {
    const now = new Date();
    const weekKey = getWeekKey(now);
    setState((prev) => {
      const alreadyDone = prev.completed.includes(promptId);
      const completed = alreadyDone ? prev.completed : [...prev.completed, promptId];
      const skipped = prev.skipped.filter((id) => id !== promptId);
      const isNewWeek = prev.lastStreakWeek !== weekKey;
      const today = now.toISOString().slice(0, 10);

      return {
        ...prev,
        completed,
        skipped,
        lastRecordDate: today,
        streakCount: prev.streakCount + (alreadyDone ? 0 : 1),
        streakWeeks: isNewWeek ? prev.streakWeeks + 1 : prev.streakWeeks,
        lastStreakWeek: weekKey,
      };
    });
  }, []);

  const markSkipped = useCallback((promptId: string) => {
    setState((prev) => {
      if (prev.skipped.includes(promptId) || prev.completed.includes(promptId)) return prev;
      return { ...prev, skipped: [...prev.skipped, promptId] };
    });
  }, []);

  const isCompleted = useCallback(
    (promptId: string) => state.completed.includes(promptId),
    [state.completed]
  );

  const isSkipped = useCallback(
    (promptId: string) => state.skipped.includes(promptId),
    [state.skipped]
  );

  // Get the visible prompt cards (3-4 cards)
  const getVisibleCards = useCallback(
    (libraryPool?: PromptCard[]): PromptCard[] => {
      const CARD_COUNT = 4;

      // 1. Remaining starter prompts (not completed, not skipped)
      const remainingStarters: PromptCard[] = STARTER_PROMPTS
        .filter((p) => !state.completed.includes(p.id) && !state.skipped.includes(p.id))
        .sort((a, b) => a.order - b.order);

      if (remainingStarters.length >= CARD_COUNT) {
        return remainingStarters.slice(0, CARD_COUNT);
      }

      // 2. Fill remaining slots from library
      const pool = libraryPool ?? VIDEO_PROMPTS.map(toLibraryCard);
      const availableLibrary = pool.filter(
        (p) => !state.completed.includes(p.id) && !state.skipped.includes(p.id)
      );
      const shuffledLibrary = shuffleArray(availableLibrary);
      const librarySlots = CARD_COUNT - remainingStarters.length;

      return [...remainingStarters, ...shuffledLibrary.slice(0, librarySlots)];
    },
    [state.completed, state.skipped]
  );

  // Shuffle only library slots — starters stay pinned
  const getRefreshedCards = useCallback(
    (currentCards: PromptCard[]): PromptCard[] => {
      const CARD_COUNT = 4;
      const pinned = currentCards.filter((c) => c.tier === 'starter');
      const librarySlots = CARD_COUNT - pinned.length;

      if (librarySlots <= 0) return currentCards;

      const currentLibraryIds = new Set(
        currentCards.filter((c) => c.tier === 'library').map((c) => c.id)
      );
      const pool = VIDEO_PROMPTS.map(toLibraryCard).filter(
        (p) =>
          !state.completed.includes(p.id) &&
          !state.skipped.includes(p.id) &&
          !currentLibraryIds.has(p.id)
      );
      const shuffled = shuffleArray(pool);

      return [...pinned, ...shuffled.slice(0, librarySlots)];
    },
    [state.completed, state.skipped]
  );

  const totalPrompts = STARTER_PROMPTS.length + VIDEO_PROMPTS.length;

  // Milestone detection
  const milestones = [5, 10, 25, 50, 75, 100];
  const currentMilestone = milestones.reduce<number | null>((hit, m) => {
    if (state.streakCount === m) return m;
    return hit;
  }, null);

  return {
    loaded,
    completedCount: state.completed.length,
    totalPrompts,
    streakCount: state.streakCount,
    streakWeeks: state.streakWeeks,
    lastRecordDate: state.lastRecordDate,
    currentMilestone,
    markCompleted,
    markSkipped,
    isCompleted,
    isSkipped,
    getVisibleCards,
    getRefreshedCards,
  };
}
