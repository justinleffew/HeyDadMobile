import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  TextInput,
  Image,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect, useRouter } from "expo-router";

import { DadCategory, DAD_CATEGORY_LABEL, deriveDadCategoryFromQuizResult, } from "../../utils/archetype";
import { PocketDadAnswer, parsePocketDad } from "../../utils/parsePocketDad";
import { supabase } from "utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HowItWorksModal from "../../components/HowItWorksModal";

import PocketDadSignupModal from "../../components/PocketDadSignupModal";
import Onboarding from "../../components/Onboarding";
import { useAuth } from "hooks/useAuth";
import AnswerCard from "../../components/AnswerCard";

import RecordLaterModal from "../../components/RecordLaterModal";
import ContextFlowModal from "../../components/ContextFlowModal";

import ArchetypeBadge from "../../components/ArchetypeBadge";
import PivotModal from "../../components/PivotModal";


type Tone = "direct" | "gentle" | "playful";
type ToneIntensity = "baseline" | "softer" | "firmer";

type StrategyVariant = "original" | "pivot";

type ContextFlowStepId = "location" | "urgency" | "triedStrategies";

type ContextFlowOption = {
  value: string;
  label: string;
  description?: string;
};

type QuickScenario = {
  id: string;
  label: string;
  description: string;
  Icon: any;
  accentBgClass: string;
  accentTextClass: string;
};

type PocketDadContextAnswers = {
  location: string | null;
  urgency: string | null;
  triedStrategies: string[];
};

type ContextFlowStep = {
  id: ContextFlowStepId;
  title: string;
  description?: string;
  multiSelect?: boolean;
  options: ContextFlowOption[];
};

type PendingPocketDadSubmission = {
  prompt: string;
  tone: Tone;
  toneIntensity: ToneIntensity;
  situationId: string | null;
};

type ChildProfile = {
  id: string;
  name: string;
  age: number | null;
  ageLabel: string;
  image: string;
  profileNote: string | null;
};

type CachedAnswer = {
  answer: PocketDadAnswer;
  raw: string;
  responseId: string | null;
  liked: boolean;
  variant: StrategyVariant;
  pivotReason: string | null;
};

type PocketDadPromptHistoryItem = {
  prompt: string;
  tone: Tone;
  responseId: string | null;
  liked: boolean;
  raw: string | null;
  answer: PocketDadAnswer | null;
  timestamp: number;
  variant: StrategyVariant;
  pivotReason: string | null;
  situationId: string | null;
};

type StoredPocketDadEntry = {
  prompt: string;
  tone: Tone;
  toneIntensity: ToneIntensity;
  childId: string | null;
  latestPrompt: string;
  latestSituationId: string | null;
  selectedSituationId: string | null;
  answer: PocketDadAnswer | null;
  raw: string | null;
  responseId: string | null;
  liked: boolean;
  variant: StrategyVariant;
  pivotReason: string | null;
  history: PocketDadPromptHistoryItem[];
  contextAnswers: PocketDadContextAnswers;
};

type StoredPocketDadData = {
  lastChildId: string | null;
  entries: Record<string, StoredPocketDadEntry>;
};

const storageKeyForUser = (userId: string) => `${POCKET_DAD_STORAGE_PREFIX}.${userId}`;


const pivotFlow = {
  title: "Need a different move?",
  description: "Tell Pocket Dad what happened so we can pivot the strategy.",
  options: [
    {
      id: "too_hard",
      title: "Too hard to pull off",
      description: "I need something simpler or shorter right now.",
    },
    {
      id: "kid_resisted",
      title: "My kid pushed back",
      description: "They resisted or ignored the plan.",
    },
    {
      id: "i_lost_it",
      title: "I couldn't stay calm",
      description: "I need help keeping my cool in the moment.",
    },
    {
      id: "situation_shifted",
      title: "The situation changed",
      description: "Things moved fast and the advice no longer fit.",
    },
  ],
  skipLabel: "Keep this advice",
};

const contextFlow: ContextFlowStep[] = [
  {
    id: "location",
    title: "Where is this going down?",
    description: "Pick the vibe so Pocket Dad can picture the scene.",
    options: [
      { value: "at_home", label: "At home", description: "Living room, bedroom, kitchen." },
      { value: "out_and_about", label: "Out & about", description: "Errands, car, or in transit." },
      { value: "practice_or_school", label: "Practice or school", description: "Sports, rehearsal, or class." },
      { value: "public", label: "Out in public", description: "Restaurant, store, friends around." },
      { value: "online", label: "Online / digital", description: "Group chat, gaming, social." },
    ],
  },
  {
    id: "urgency",
    title: "How fast do you need to move?",
    description: "Helps Pocket Dad match the energy.",
    options: [
      { value: "right_now", label: "It’s happening right now", description: "Need words immediately." },
      { value: "tonight", label: "Later today", description: "You’ll circle back soon." },
      { value: "can_wait", label: "It can wait", description: "You’re planning ahead." },
    ],
  },
  {
    id: "triedStrategies",
    title: "What have you already tried?",
    description: "Tap everything that applies.",
    multiSelect: true,
    options: [
      { value: "talked_it_through", label: "Talked it through" },
      { value: "set_limit", label: "Set a boundary or consequence" },
      { value: "gave_space", label: "Gave them space" },
      { value: "asked_questions", label: "Asked questions" },
      { value: "validated", label: "Validated feelings" },
      { value: "used_humor", label: "Tried humor" },
      { value: "other_caregiver", label: "Looped in another adult" },
    ],
  },
];


const CONTEXT_LOCATION_VALUES = new Set(
  contextFlow.find((step) => step.id === "location")?.options.map((option) => option.value) ?? []
);
const CONTEXT_URGENCY_VALUES = new Set(
  contextFlow.find((step) => step.id === "urgency")?.options.map((option) => option.value) ?? []
);
const CONTEXT_TRIED_STRATEGY_VALUES = new Set(
  contextFlow.find((step) => step.id === "triedStrategies")?.options.map((option) => option.value) ?? []
);

const cloneContextAnswers = (answers: PocketDadContextAnswers): PocketDadContextAnswers => ({
  location: answers.location,
  urgency: answers.urgency,
  triedStrategies: [...answers.triedStrategies],
});

const sanitizeContextAnswers = (answers: unknown): PocketDadContextAnswers => {
  const base = cloneContextAnswers(DEFAULT_CONTEXT_ANSWERS);
  if (!answers || typeof answers !== "object") {
    return base;
  }

  const candidate = answers as Partial<PocketDadContextAnswers> & {
    triedStrategies?: unknown;
    location?: unknown;
    urgency?: unknown;
  };

  if (typeof candidate.location === "string" && CONTEXT_LOCATION_VALUES.has(candidate.location)) {
    base.location = candidate.location;
  }

  if (typeof candidate.urgency === "string" && CONTEXT_URGENCY_VALUES.has(candidate.urgency)) {
    base.urgency = candidate.urgency;
  }

  if (Array.isArray(candidate.triedStrategies)) {
    const normalized = candidate.triedStrategies.reduce<string[]>((acc, value) => {
      if (typeof value !== "string" || !CONTEXT_TRIED_STRATEGY_VALUES.has(value)) {
        return acc;
      }
      if (!acc.includes(value)) {
        acc.push(value);
      }
      return acc;
    }, []);
    base.triedStrategies = normalized;
  }

  return base;
};


// ⬇️ All your type definitions / constants / helpers from the web
// (Tone, ToneIntensity, StrategyVariant, QUICK_SCENARIOS, contextFlow, etc.)
// can be copied here unchanged, except storage helpers which we replaced above.


const QUICK_SCENARIOS: QuickScenario[] = [
  {
    id: "meltdown",
    label: "We're melting down",
    description: "We're in a meltdown and nothing I'm trying is working.",
    // Icon: MessageCircle,
    // Icon: View,
    Icon: "chatbox",
    accentBgClass: "bg-[#233448]",
    accentTextClass: "#F6E8C3",
  },
  {
    id: "not_listening",
    label: "Won't listen",
    description: "My kid keeps ignoring me even when I stay calm and clear.",
    Icon: "trophy",
    // Icon: View,
    accentBgClass: "bg-[#2B3D54]",
    accentTextClass: "#C9F0FF",
  },
];


const map = new Map<string, QuickScenario>();
const quickScenarioMap = new Map<string, QuickScenario>();
QUICK_SCENARIOS.forEach((scenario) => {
  map.set(scenario.id, scenario);
});


const TONES: Tone[] = ["direct", "gentle", "playful"];
const TONE_INTENSITIES: ToneIntensity[] = ["softer", "baseline", "firmer"];
const DEFAULT_TONE: Tone = "direct";
const DEFAULT_TONE_INTENSITY: ToneIntensity = "baseline";
const BRIDGE_DEFAULT_MILESTONE = "next big game day";
const FALLBACK_ERROR = "Couldn't load advice. Try again.";
const POCKET_DAD_INVALID_FORMAT = "POCKET_DAD_INVALID_FORMAT";

const POCKET_DAD_STORAGE_PREFIX = "hd.pocketdad.session";
const CHILD_STORAGE_FALLBACK = "none";

const QUICK_SCENARIO_IDS = new Set(QUICK_SCENARIOS.map((scenario) => scenario.id));
const DEFAULT_SITUATION_ID = QUICK_SCENARIOS[0]?.id ?? null;
const DEFAULT_STORED_DATA: StoredPocketDadData = { lastChildId: null, entries: {} };

const DEFAULT_CONTEXT_ANSWERS: PocketDadContextAnswers = {
  location: null,
  urgency: null,
  triedStrategies: [],
};

const lastQuickScenarioRef = { current: null as string | null };

const coerceStoredAnswer = (
  raw: unknown,
  fallback: unknown
): { answer: PocketDadAnswer | null; raw: string | null } => {
  if (typeof raw === "string") {
    try {
      const parsed = parsePocketDad(raw);
      return { answer: parsed, raw };
    } catch (error) {
      return { answer: null, raw: null };
    }
  }

  if (fallback && typeof fallback === "object") {
    try {
      const stringified = JSON.stringify(fallback);
      const parsed = parsePocketDad(stringified);
      return { answer: parsed, raw: stringified };
    } catch (error) {
      return { answer: null, raw: null };
    }
  }

  return { answer: null, raw: null };
};


function hashPrompt(prompt: string): string {
  let hash = 0;
  const normalized = prompt.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const cacheKeyFor = (
  promptValue: string,
  toneValue: Tone,
  intensityValue: ToneIntensity,
  childId: string | null,
  context: PocketDadContextAnswers,
  situationId: string | null = null,
  pivotReason: string | null = null
) => {
  const contextKeyParts: string[] = [
    context.location ?? "none",
    context.urgency ?? "none",
    context.triedStrategies.length
      ? [...context.triedStrategies].sort().join("|")
      : "none",
  ];

  const hashSource = `${promptValue}::${situationId ?? ""}`;

  return `${hashPrompt(hashSource)}::${toneValue}::${intensityValue}::${childId ?? "none"}::${contextKeyParts.join("::")
    }::${situationId ?? "none"}::${pivotReason ?? "original"}`;
};

const sanitizeStoredEntry = (entry: Partial<StoredPocketDadEntry>): StoredPocketDadEntry => {
  const history = Array.isArray(entry.history)
    ? entry.history.reduce<PocketDadPromptHistoryItem[]>((acc, item) => {
      if (!item || typeof item !== "object") return acc;
      const candidate = item as Partial<PocketDadPromptHistoryItem> & {
        raw?: unknown;
        answer?: unknown;
        situationId?: unknown;
      };
      if (typeof candidate.prompt !== "string") return acc;
      if (typeof candidate.tone !== "string" || !TONES.includes(candidate.tone as Tone)) return acc;
      if (typeof candidate.timestamp !== "number") return acc;
      if (candidate.responseId !== null && typeof candidate.responseId !== "string") return acc;
      if (candidate.raw !== null && typeof candidate.raw !== "string") return acc;
      if (typeof candidate.liked !== "boolean") return acc;

      const { answer, raw } = coerceStoredAnswer(candidate.raw ?? null, candidate.answer ?? null);
      const normalizedVariant: StrategyVariant = candidate.variant === "pivot" ? "pivot" : "original";
      const normalizedPivotReason = typeof candidate.pivotReason === "string" ? candidate.pivotReason : null;

      acc.push({
        prompt: candidate.prompt,
        tone: candidate.tone as Tone,
        responseId: candidate.responseId ?? null,
        liked: candidate.liked,
        raw,
        answer,
        timestamp: candidate.timestamp,
        variant: normalizedVariant,
        pivotReason: normalizedPivotReason,
        situationId:
          typeof candidate.situationId === "string" && QUICK_SCENARIO_IDS.has(candidate.situationId)
            ? candidate.situationId
            : null,
      });

      return acc;
    }, [])
    : [];

  const { answer, raw } = coerceStoredAnswer(entry.raw ?? null, entry.answer ?? null);
  const sanitizedContext = sanitizeContextAnswers(entry.contextAnswers);
  const normalizedVariant: StrategyVariant = entry.variant === "pivot" ? "pivot" : "original";
  const normalizedPivotReason = typeof entry.pivotReason === "string" ? entry.pivotReason : null;

  return {
    prompt: typeof entry.prompt === "string" ? entry.prompt : "",
    tone: TONES.includes(entry.tone ?? "") ? (entry.tone as Tone) : DEFAULT_TONE,
    toneIntensity: TONE_INTENSITIES.includes(entry.toneIntensity ?? "")
      ? (entry.toneIntensity as ToneIntensity)
      : DEFAULT_TONE_INTENSITY,
    childId: entry.childId ?? null,
    latestPrompt: typeof entry.latestPrompt === "string" ? entry.latestPrompt : "",
    latestSituationId:
      typeof entry.latestSituationId === "string" && QUICK_SCENARIO_IDS.has(entry.latestSituationId)
        ? entry.latestSituationId
        : null,
    selectedSituationId:
      typeof entry.selectedSituationId === "string" && QUICK_SCENARIO_IDS.has(entry.selectedSituationId)
        ? entry.selectedSituationId
        : DEFAULT_SITUATION_ID,
    answer,
    raw,
    responseId: typeof entry.responseId === "string" && entry.responseId.trim() ? entry.responseId : null,
    liked: entry.liked === true,
    variant: normalizedVariant,
    pivotReason: normalizedPivotReason,
    history,
    contextAnswers: sanitizedContext,
  };
};


function buildAgeLabel(age: number | null): string {
  if (age === null || Number.isNaN(age)) return "Age unavailable";
  if (age <= 1) return "Age 1";
  return `Age ${age}`;
}

// const quickScenarioMap = useMemo(() => {
//   const map = new Map<string, QuickScenario>();
//   QUICK_SCENARIOS.forEach((scenario) => {
//     map.set(scenario.id, scenario);
//   });
//   return map;
// }, []);

// const quickScenarioMap = () => {
//   const map = new Map<string, QuickScenario>();
//   QUICK_SCENARIOS.forEach((scenario) => {
//     map.set(scenario.id, scenario);
//   });
//   return map;
// }
//
const buildPocketDadPayload = async (
  promptValue: string,
  toneValue: Tone,
  intensityValue: ToneIntensity,
  child: ChildProfile | null,
  persona: string,
  contextAnswers: PocketDadContextAnswers,
  situationId: string | null,
  metadata?: Record<string, unknown>
) => {
  const scenario = situationId ? quickScenarioMap?.get(situationId) ?? null : null;
  const trimmedPrompt = promptValue.trim();
  const resolvedPrompt = trimmedPrompt || scenario?.description || persona;

  const { data: { session } } = await supabase.auth.getSession();
  const id = session?.user.id

  return {
    prompt: resolvedPrompt,
    prompt_details: {
      raw: promptValue,
      trimmed: trimmedPrompt,
    },
    tone: toneValue,
    tone_intensity: intensityValue,
    child: {
      name: child?.name ?? null,
      age_years: child?.age ?? null,
      profile_note: child?.profileNote ?? null,
    },
    situation: situationId
      ? {
        id: situationId,
        label: scenario?.label ?? null,
        description: scenario?.description ?? null,
      }
      : null,
    context: {
      location: contextAnswers.location,
      urgency: contextAnswers.urgency,
      tried_strategies: contextAnswers.triedStrategies,
      recent_topics: [],
      parenting_style: null,
    },
    // user_id: user?.id ?? null,
    user_id: id ?? null,
    persona,
    child_id: child?.id ?? null,
    ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
  };
};


const fetchPocketDadAnswer = async ({
  promptValue,
  toneValue,
  intensityValue,
  child,
  persona,
  contextAnswers,
  situationId,
  signal,
  metadata,
}: {
  promptValue: string;
  toneValue: Tone;
  intensityValue: ToneIntensity;
  child: ChildProfile | null;
  persona: string;
  contextAnswers: PocketDadContextAnswers;
  situationId: string | null;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}): Promise<Omit<CachedAnswer, "variant" | "pivotReason">> => {
  const payload = await buildPocketDadPayload(
    promptValue,
    toneValue,
    intensityValue,
    child,
    persona,
    contextAnswers,
    situationId,
    metadata
  )

  const response = await fetch("https://heydad.pro/api/pocket-dad", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  const rawText = await response.text();
  let responseIdFromApi: string | null = null;
  let likedFromApi = false;

  if (!response.ok) {
    let errorMessage = rawText || FALLBACK_ERROR;
    const trimmedError = rawText.trim();
    if (trimmedError.startsWith("{")) {
      try {
        const json = JSON.parse(trimmedError);
        if (typeof json?.error === "string") {
          errorMessage = json.error;
        }
      } catch (jsonError) {
        console.warn("Pocket Dad error payload parse failed", jsonError);
      }
    }
    throw new Error(errorMessage || FALLBACK_ERROR);
  }

  const normalizeSuccessPayload = (
    textPayload: string
  ): { message: string; responseId: string | null; liked: boolean; error: string | null } => {
    const trimmed = textPayload.trim();
    if (!trimmed) {
      return { message: "", responseId: null, liked: false, error: null };
    }

    if (!trimmed.startsWith("{")) {
      return { message: trimmed, responseId: null, liked: false, error: null };
    }

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed.error === "string") {
        return { message: "", responseId: null, liked: false, error: parsed.error };
      }

      const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
      const responseId = typeof parsed.response_id === "string" ? parsed.response_id : null;
      const liked = parsed.liked === true;

      return {
        message: message || trimmed,
        responseId,
        liked,
        error: null,
      };
    } catch (parseError) {
      console.warn("Pocket Dad response parse fallback", parseError);
      return { message: trimmed, responseId: null, liked: false, error: null };
    }
  };

  const { message, responseId, liked, error: parseErrorMessage } = normalizeSuccessPayload(rawText);

  if (parseErrorMessage) {
    throw new Error(parseErrorMessage);
  }

  if (!message.trim()) {
    throw new Error(FALLBACK_ERROR);
  }

  responseIdFromApi = responseId;
  likedFromApi = liked;

  const normalized = message.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new Error(FALLBACK_ERROR);
  }

  let parsed: PocketDadAnswer;
  try {
    parsed = parsePocketDad(normalized);
  } catch (parseError) {
    const invalidError = new Error(POCKET_DAD_INVALID_FORMAT) as Error & { raw?: string };
    invalidError.raw = normalized;
    throw invalidError;
  }

  return {
    answer: parsed,
    raw: normalized,
    responseId: responseIdFromApi,
    liked: likedFromApi,
  };
};


/**
 * Reads stored PocketDad cached data from AsyncStorage.
 */
export const readStoredPocketDadData = async (
  userId: string
): Promise<StoredPocketDadData> => {
  const storageKey = storageKeyForUser(userId);

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return DEFAULT_STORED_DATA;

    const parsed = JSON.parse(raw) as Partial<StoredPocketDadData> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_STORED_DATA;

    const entries: Record<string, StoredPocketDadEntry> = {};

    if (parsed.entries && typeof parsed.entries === "object") {
      for (const [key, value] of Object.entries(parsed.entries)) {
        if (value && typeof value === "object") {
          entries[key] = sanitizeStoredEntry(value as Partial<StoredPocketDadEntry>);
        }
      }
    }

    return {
      lastChildId: parsed.lastChildId ?? null,
      entries,
    };
  } catch (err) {
    console.warn("Unable to parse Pocket Dad cache", err);
    await AsyncStorage.removeItem(storageKey);
    return DEFAULT_STORED_DATA;
  }
};


/**
 * Persists PocketDad stored data to AsyncStorage.
 */
export const persistStoredPocketDadData = async (
  userId: string,
  data: StoredPocketDadData
): Promise<void> => {
  const storageKey = storageKeyForUser(userId);

  // If empty → remove item entirely
  if (!Object.keys(data.entries).length && data.lastChildId === null) {
    await AsyncStorage.removeItem(storageKey);
    return;
  }

  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to persist Pocket Dad cache:", err);
  }
};

export default function PocketDadInput() {
  const { user } = useAuth();
  const scrollRef = useRef(null)
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(
    DEFAULT_SITUATION_ID
  );
  const [latestSituationId, setLatestSituationId] = useState<string | null>(
    DEFAULT_SITUATION_ID
  );
  const [showHow, setShowHow] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [tone, setTone] = useState<Tone>(DEFAULT_TONE);
  const [toneIntensity, setToneIntensity] =
    useState<ToneIntensity>(DEFAULT_TONE_INTENSITY);
  const [archetypeCategory, setArchetypeCategory] =
    useState<DadCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] =
    useState<PocketDadAnswer | null>(null);
  const [latestPrompt, setLatestPrompt] = useState<string>("");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordDefaults, setRecordDefaults] = useState({
    title: "",
    milestone: BRIDGE_DEFAULT_MILESTONE,
  });
  const [currentResponseId, setCurrentResponseId] =
    useState<string | null>(null);
  const [currentResponseLiked, setCurrentResponseLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [promptHistory, setPromptHistory] = useState<
    PocketDadPromptHistoryItem[]
  >([]);
  const [pivotModalOpen, setPivotModalOpen] = useState(false);
  const [pivotSelection, setPivotSelection] = useState<string | null>(null);
  const [currentStrategyVariant, setCurrentStrategyVariant] =
    useState<StrategyVariant>("original");
  const [currentPivotReason, setCurrentPivotReason] = useState<string | null>(
    null
  );
  const [contextAnswers, setContextAnswers] =
    useState<PocketDadContextAnswers>(() =>
      cloneContextAnswers(DEFAULT_CONTEXT_ANSWERS)
    );
  const [contextDraftAnswers, setContextDraftAnswers] =
    useState<PocketDadContextAnswers>(() =>
      cloneContextAnswers(DEFAULT_CONTEXT_ANSWERS)
    );
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextStepIndex, setContextStepIndex] = useState(0);
  const [pendingSubmission, setPendingSubmission] =
    useState<PendingPocketDadSubmission | null>(null);
  const [quickScenarioPulse, setQuickScenarioPulse] = useState(false);

  const promptInputRef = useRef<TextInput | null>(null);
  const cacheRef = useRef<Map<string, CachedAnswer>>(new Map());
  const prefetchingRef = useRef<Set<string>>(new Set());
  const viewedKeysRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const viewTrackedRef = useRef(false);

  const storedDataRef = useRef<StoredPocketDadData>({
    lastChildId: null,
    entries: {},
  });

  const handleRecordConfirm = async ({
    title,
    unlockType,
    unlockValue,
  }: {
    title: string;
    unlockType: "milestone" | "date" | "age";
    unlockValue: string;
  }) => {
    if (!user?.id || !selectedChild?.id) {
      throw new Error("Missing user or child");
    }

    // const response = await fetch("/api/pocketdad/save-legacy", {
    const response = await fetch("https://heydad.pro/api/pocketdad/save-legacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        child_id: selectedChild.id,
        title,
        suggested_unlock_type: unlockType,
        suggested_unlock_value: unlockValue,
        source: "PocketDad",
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to save for later");
    }
  };


  const childStorageKey = (childId: string | null) => childId ?? CHILD_STORAGE_FALLBACK;

  const getHistoryForChild = (childId: string | null) => {
    const key = childStorageKey(childId);
    return storedDataRef.current.entries[key]?.history ?? [];
  };

  const storageInitializedRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  const isAuthenticated = Boolean(user);

  const runPocketDad = async (
    promptValue: string,
    toneValue: Tone,
    intensityValue: ToneIntensity,
    child: ChildProfile | null,
    situationId: string | null,
    options?: {
      pivotReason?: string | null;
      metadata?: Record<string, unknown>;
      variant?: StrategyVariant;
      retried?: boolean;
      contextAnswers?: PocketDadContextAnswers;
    }
  ) => {
    const {
      pivotReason = null,
      metadata,
      variant = pivotReason ? "pivot" : "original",
      retried = false,
      contextAnswers: overrideContext,
    } = options ?? {};
    const context = cloneContextAnswers(overrideContext ?? contextAnswers);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const personaLabel = archetypeCategory ? DAD_CATEGORY_LABEL[archetypeCategory] : toneValue;

    try {
      const result = await fetchPocketDadAnswer({
        promptValue,
        toneValue,
        intensityValue,
        child,
        persona: personaLabel,
        contextAnswers: context,
        situationId,
        signal: controller.signal,
        metadata,
      });

      const key = cacheKeyFor(
        promptValue,
        toneValue,
        intensityValue,
        child?.id ?? null,
        context,
        situationId,
        pivotReason
      );
      const annotatedResult: CachedAnswer = {
        ...result,
        variant,
        pivotReason,
      };
      cacheRef.current.set(key, annotatedResult);
      setCurrentAnswer(annotatedResult.answer);
      setCurrentResponseId(annotatedResult.responseId ?? null);
      setCurrentResponseLiked(annotatedResult.liked);
      setLikePending(false);
      setError(null);
      setLoading(false);
      setCurrentStrategyVariant(variant);
      setCurrentPivotReason(pivotReason);
      const entryKey = childStorageKey(child?.id ?? null);
      const previousEntry = storedDataRef.current.entries[entryKey];

      const previousHistory = getHistoryForChild(child?.id ?? null);
      const lastHistory = previousHistory[previousHistory.length - 1];
      const shouldUpdateLast =
        lastHistory
        && lastHistory.prompt === promptValue
        && lastHistory.tone === toneValue
        && lastHistory.variant === variant
        && (lastHistory.pivotReason ?? null) === (pivotReason ?? null)
        && (lastHistory.situationId ?? null) === (situationId ?? null);
      const responseHistory = shouldUpdateLast
        ? [
          ...previousHistory.slice(0, -1),
          {
            ...lastHistory,
            responseId: annotatedResult.responseId ?? null,
            liked: annotatedResult.liked,
            raw: annotatedResult.raw,
            answer: annotatedResult.answer,
          },
        ]
        : [
          ...previousHistory,
          {
            prompt: promptValue,
            tone: toneValue,
            responseId: annotatedResult.responseId ?? null,
            liked: annotatedResult.liked,
            raw: annotatedResult.raw,
            answer: annotatedResult.answer,
            timestamp: Date.now(),
            variant,
            pivotReason,
            situationId,
          },
        ];
      updateStoredEntry(child?.id ?? null, {
        prompt: previousEntry?.prompt ?? promptValue,
        tone: toneValue,
        toneIntensity: intensityValue,
        childId: child?.id ?? null,
        latestPrompt: promptValue,
        latestSituationId: situationId,
        answer: annotatedResult.answer,
        raw: annotatedResult.raw,
        responseId: annotatedResult.responseId ?? null,
        liked: annotatedResult.liked,
        variant,
        pivotReason,
        history: responseHistory,
        contextAnswers: context,
      });
      if (!viewedKeysRef.current.has(key)) {
        viewedKeysRef.current.add(key);

      }

      warmToneCache(promptValue, toneValue, child, context, situationId);
      if (pivotReason) {
        setPivotSelection(null);
      }
      if (scrollRef.current) {
        scrollRef?.current?.scrollToEnd({ animated: true })
      }

    } catch (fetchError) {
      if (controller.signal.aborted) return;

      if (
        !retried
        && fetchError instanceof Error
        && fetchError.message === POCKET_DAD_INVALID_FORMAT
      ) {
        runPocketDad(promptValue, toneValue, intensityValue, child, situationId, {
          pivotReason,
          metadata,
          variant,
          retried: true,
          contextAnswers: context,
        });
        return;
      }

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return;
      }

      if (
        fetchError instanceof Error
        && fetchError.message === POCKET_DAD_INVALID_FORMAT
        && retried
      ) {
        const rawPreview = (fetchError as { raw?: string }).raw ?? "";
      }

      console.error("Pocket Dad request failed", fetchError);
      setLoading(false);
      if (
        fetchError instanceof Error
        && fetchError.message === POCKET_DAD_INVALID_FORMAT
      ) {
        setError(FALLBACK_ERROR);
      } else {
        setError(fetchError instanceof Error ? fetchError.message || FALLBACK_ERROR : FALLBACK_ERROR);
      }
      if (pivotReason) {
        setPivotSelection(null);
      }
    }
  };

  const startPivotRequest = (reasonId: string) => {
    if (!latestPrompt && !latestSituationId) {
      setPivotSelection(null);
      return;
    }

    const trimmedPrompt = latestPrompt.trim();
    const pivotSituationId = latestSituationId ?? selectedSituationId ?? null;
    if (!trimmedPrompt && !pivotSituationId) {
      setPivotSelection(null);
      return;
    }

    setError(null);
    setLoading(true);
    setCurrentResponseId(null);
    setCurrentResponseLiked(false);
    setLikePending(false);
    setCurrentStrategyVariant("pivot");
    setCurrentPivotReason(reasonId);

    const previousHistory = getHistoryForChild(selectedChild?.id ?? null);
    const pivotHistoryItem: PocketDadPromptHistoryItem = {
      prompt: trimmedPrompt,
      tone,
      responseId: null,
      liked: false,
      raw: null,
      answer: null,
      timestamp: Date.now(),
      variant: "pivot",
      pivotReason: reasonId,
      situationId: pivotSituationId,
    };
    const pendingHistory = [...previousHistory, pivotHistoryItem];

    updateStoredEntry(selectedChild?.id ?? null, {
      prompt: prompt,
      tone,
      toneIntensity,
      childId: selectedChild?.id ?? null,
      latestPrompt: trimmedPrompt,
      latestSituationId: pivotSituationId,
      answer: null,
      raw: null,
      responseId: null,
      liked: false,
      history: pendingHistory,
      variant: "pivot",
      pivotReason: reasonId,
      contextAnswers,
    });

    const key = cacheKeyFor(
      trimmedPrompt,
      tone,
      toneIntensity,
      selectedChild?.id ?? null,
      contextAnswers,
      pivotSituationId,
      reasonId
    );
    const cached = cacheRef.current.get(key);
    if (cached) {
      const cachedHistory = pendingHistory.length
        ? [
          ...pendingHistory.slice(0, -1),
          {
            ...pendingHistory[pendingHistory.length - 1],
            responseId: cached.responseId ?? null,
            liked: cached.liked ?? false,
            raw: cached.raw,
            answer: cached.answer,
            variant: cached.variant ?? "pivot",
            pivotReason: cached.pivotReason ?? reasonId,
            situationId: pivotSituationId,
          },
        ]
        : pendingHistory;

      setCurrentAnswer(cached.answer);
      setCurrentResponseId(cached.responseId ?? null);
      setCurrentResponseLiked(cached.liked ?? false);
      setLikePending(false);
      setLoading(false);
      setCurrentStrategyVariant(cached.variant ?? "pivot");
      setCurrentPivotReason(cached.pivotReason ?? reasonId);
      updateStoredEntry(selectedChild?.id ?? null, {
        prompt: prompt,
        tone,
        toneIntensity,
        childId: selectedChild?.id ?? null,
        latestPrompt: trimmedPrompt,
        latestSituationId: pivotSituationId,
        answer: cached.answer,
        raw: cached.raw,
        responseId: cached.responseId ?? null,
        liked: cached.liked ?? false,
        history: cachedHistory,
        variant: cached.variant ?? "pivot",
        pivotReason: cached.pivotReason ?? reasonId,
        contextAnswers,
      });
      if (!viewedKeysRef.current.has(key)) {
        viewedKeysRef.current.add(key);
      }
      warmToneCache(trimmedPrompt, tone, selectedChild, contextAnswers, pivotSituationId);
      setPivotSelection(null);
      return;
    }

    runPocketDad(trimmedPrompt, tone, toneIntensity, selectedChild, pivotSituationId, {
      pivotReason: reasonId,
      metadata: { pivot_reason: reasonId },
      variant: "pivot",
      contextAnswers,
    });
  }


  const promptForSignup = useCallback(() => {
    if (isAuthenticated) return false;
    setShowSignupPrompt(true);
    return true;
  }, [isAuthenticated]);

  const dismissQuickScenarioPulse = useCallback(() => {
    setQuickScenarioPulse(false);
  }, []);



  const handlePivotOpen = () => {
    if (!currentAnswer) return;
    if (promptForSignup()) return;
    setPivotSelection(null);
    setPivotModalOpen(true);
  };

  const handlePivotCancel = () => {
    setPivotModalOpen(false);
    setPivotSelection(null);
  };

  const handlePivotSelect = (reasonId: string) => {
    setPivotModalOpen(false);
    setPivotSelection(reasonId);
    startPivotRequest(reasonId);
  };


  const handleRecordLater = () => {
    if (!currentAnswer) return;
    const script = currentAnswer.primaryAction.script?.trim() ?? "";
    const titleSource = script || currentAnswer.primaryAction.title || "Pocket Dad coaching moment";
    const generatedTitle = titleSource.length > 60
      ? `${titleSource.slice(0, 57)}…`
      : titleSource;
    setRecordDefaults({ title: generatedTitle, milestone: BRIDGE_DEFAULT_MILESTONE });
    setRecordModalOpen(true);
  };


  const handleLikeCurrent = async () => {
    if (!currentAnswer) return;
    if (!isAuthenticated) {
      promptForSignup();
      return;
    }
    if (!user?.id || !currentResponseId || currentResponseLiked || likePending) {
      return;
    }

    setLikePending(true);
    try {
      const response = await fetch("https://heydad.pro/api/pocketdad-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: currentResponseId, user_id: user.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Unable to save like");
      }

      setCurrentResponseLiked(true);

      if (latestPrompt || latestSituationId) {
        const cacheSituationId = latestSituationId ?? selectedSituationId ?? null;
        const key = cacheKeyFor(
          latestPrompt.trim(),
          tone,
          toneIntensity,
          selectedChild?.id ?? null,
          contextAnswers,
          cacheSituationId,
          currentPivotReason
        );
        const cached = cacheRef.current.get(key);
        if (cached) {
          cacheRef.current.set(key, { ...cached, liked: true });
        }
      }

      const history = getHistoryForChild(selectedChild?.id ?? null);
      const lastHistory = history[history.length - 1];
      const likedHistory =
        lastHistory && lastHistory.responseId === currentResponseId
          ? [
            ...history.slice(0, -1),
            { ...lastHistory, liked: true },
          ]
          : history;

      updateStoredEntry(selectedChild?.id ?? null, {
        liked: true,
        responseId: currentResponseId,
        history: likedHistory,
      });
    } catch (likeError) {
      console.error("Unable to record Pocket Dad like", likeError);
    } finally {
      setLikePending(false);
    }
  };

  const baseAnalytics = useMemo(
    () => ({
      user_id: user?.id ?? null,
      child_id: selectedChild?.id ?? null,
      tone,
      tone_intensity: toneIntensity,
      selected_situation: selectedSituationId ?? null,
    }),
    [selectedChild?.id, selectedSituationId, tone, toneIntensity, user?.id]
  );

  const updateStoredEntry = (childId: string | null, entry: Partial<StoredPocketDadEntry>) => {
    if (!user?.id) return;
    const key = childStorageKey(childId);
    const previous = storedDataRef.current.entries[key] ?? sanitizeStoredEntry({ childId });
    const sanitized = sanitizeStoredEntry({ ...previous, ...entry, childId });
    const nextEntries = { ...storedDataRef.current.entries, [key]: sanitized };
    const nextData: StoredPocketDadData = {
      lastChildId: sanitized.childId ?? null,
      entries: nextEntries,
    };
    storedDataRef.current = nextData;
    if ((selectedChild?.id ?? null) === (sanitized.childId ?? null)) {
      setPromptHistory(sanitized.history);
      const nextContext = cloneContextAnswers(sanitized.contextAnswers);
      setContextAnswers(nextContext);
      setContextDraftAnswers(cloneContextAnswers(nextContext));
    }
    persistStoredData(nextData);
  };

  const handleSituationSelect = useCallback(
    (situationId: string) => {
      if (promptForSignup()) return;
      if (!QUICK_SCENARIO_IDS.has(situationId)) return;

      dismissQuickScenarioPulse();

      if (selectedSituationId !== situationId) {
        setSelectedSituationId(situationId);
        updateStoredEntry(selectedChild?.id ?? null, { selectedSituationId: situationId });
      }

      promptInputRef.current?.focus();
    },
    [
      baseAnalytics,
      dismissQuickScenarioPulse,
      promptForSignup,
      selectedChild?.id,
      selectedSituationId,
      updateStoredEntry,
    ]
  );


  const persistStoredData = (data: StoredPocketDadData) => {
    if (!user?.id) return;
    persistStoredPocketDadData(user.id, data);
  };

  const handleEngageClick = () => {
    if (promptForSignup()) return;

    const trimmed = prompt.trim();
    if (!trimmed && !selectedSituationId) {
      setError("Pick a situation to get Pocket Dad's help.");
      return;
    }

    setError(null);
    setPendingSubmission({ prompt: trimmed, tone, toneIntensity, situationId: selectedSituationId ?? null });
    setContextDraftAnswers(cloneContextAnswers(contextAnswers));
    setContextStepIndex(0);
    setContextModalOpen(true);
  };


  const warmToneCache = (
    promptValue: string,
    activeTone: Tone,
    child: ChildProfile | null,
    context: PocketDadContextAnswers,
    situationId: string | null
  ) => {
    const trimmedPrompt = promptValue.trim();
    if (!trimmedPrompt && !situationId) return;

    TONES.forEach((candidateTone) => {
      if (candidateTone === activeTone) return;

      const key = cacheKeyFor(
        trimmedPrompt,
        candidateTone,
        DEFAULT_TONE_INTENSITY,
        child?.id ?? null,
        context,
        situationId
      );

      if (cacheRef.current.has(key) || prefetchingRef.current.has(key)) {
        return;
      }

      prefetchingRef.current.add(key);
      const personaLabel = archetypeCategory
        ? DAD_CATEGORY_LABEL[archetypeCategory]
        : candidateTone;

      const performPrefetch = async (allowRetry: boolean): Promise<void> => {
        try {
          const result = await fetchPocketDadAnswer({
            promptValue: trimmedPrompt,
            toneValue: candidateTone,
            intensityValue: DEFAULT_TONE_INTENSITY,
            child,
            persona: personaLabel,
            contextAnswers: context,
            situationId,
            metadata: { prefetch: true },
            signal: controller.signal,
          });
          cacheRef.current.set(key, {
            ...result,
            variant: "original",
            pivotReason: null,
          });
          if (scrollRef.current) {
            scrollRef?.current?.scrollToEnd({ animated: true })
          }
        } catch (prefetchError) {
          if (
            allowRetry
            && prefetchError instanceof Error
            && prefetchError.message === POCKET_DAD_INVALID_FORMAT
          ) {
            await performPrefetch(false);
            return;
          }
          if (prefetchError instanceof Error && prefetchError.name === "AbortError") {
            return;
          }
          console.warn("Pocket Dad tone prefetch failed", {
            tone: candidateTone,
            error: prefetchError,
          });
        } finally {
          if (allowRetry) {
            prefetchingRef.current.delete(key);
          }
        }
      };

      void performPrefetch(true);
    });
  };



  const executePromptSubmission = (
    nextPrompt: string,
    toneValue: Tone,
    intensityValue: ToneIntensity,
    appliedContext: PocketDadContextAnswers = contextAnswers,
    situationId: string | null = selectedSituationId
  ) => {
    const trimmed = nextPrompt.trim();
    if (!trimmed && !situationId) {
      setError("Pick a situation to get Pocket Dad's help.");
      return;
    }

    setLatestPrompt(trimmed);
    setLatestSituationId(situationId ?? null);
    setError(null);
    setLoading(true);
    setCurrentResponseId(null);
    setCurrentResponseLiked(false);
    setLikePending(false);
    setCurrentStrategyVariant("original");
    setCurrentPivotReason(null);
    setPivotSelection(null);

    const previousHistory = getHistoryForChild(selectedChild?.id ?? null);
    const pendingHistoryItem: PocketDadPromptHistoryItem = {
      prompt: trimmed,
      tone: toneValue,
      responseId: null,
      liked: false,
      raw: null,
      answer: null,
      timestamp: Date.now(),
      variant: "original",
      pivotReason: null,
      situationId,
    };
    const pendingHistory = [...previousHistory, pendingHistoryItem];

    updateStoredEntry(selectedChild?.id ?? null, {
      prompt: nextPrompt,
      tone: toneValue,
      toneIntensity: intensityValue,
      childId: selectedChild?.id ?? null,
      latestPrompt: trimmed,
      latestSituationId: situationId,
      answer: null,
      raw: null,
      responseId: null,
      liked: false,
      history: pendingHistory,
      variant: "original",
      pivotReason: null,
      contextAnswers: appliedContext,
    });

    const key = cacheKeyFor(
      trimmed,
      toneValue,
      intensityValue,
      selectedChild?.id ?? null,
      appliedContext,
      situationId,
      null
    );
    const cached = cacheRef.current.get(key);
    if (cached) {
      const cachedHistory = pendingHistory.length
        ? [
          ...pendingHistory.slice(0, -1),
          {
            ...pendingHistory[pendingHistory.length - 1],
            responseId: cached.responseId ?? null,
            liked: cached.liked ?? false,
            raw: cached.raw,
            answer: cached.answer,
            variant: cached.variant ?? "original",
            pivotReason: cached.pivotReason ?? null,
          },
        ]
        : pendingHistory;

      setCurrentAnswer(cached.answer);
      setCurrentResponseId(cached.responseId ?? null);
      setCurrentResponseLiked(cached.liked ?? false);
      setLikePending(false);
      setLoading(false);
      setCurrentStrategyVariant(cached.variant ?? "original");
      setCurrentPivotReason(cached.pivotReason ?? null);
      updateStoredEntry(selectedChild?.id ?? null, {
        prompt: nextPrompt,
        tone: toneValue,
        toneIntensity: intensityValue,
        childId: selectedChild?.id ?? null,
        latestPrompt: trimmed,
        latestSituationId: situationId,
        answer: cached.answer,
        raw: cached.raw,
        responseId: cached.responseId ?? null,
        liked: cached.liked ?? false,
        history: cachedHistory,
        variant: cached.variant ?? "original",
        pivotReason: cached.pivotReason ?? null,
        contextAnswers: appliedContext,
      });
      if (!viewedKeysRef.current.has(key)) {
        viewedKeysRef.current.add(key);
      }
      warmToneCache(trimmed, toneValue, selectedChild, appliedContext, situationId);
      return;
    }

    setCurrentAnswer(null);
    setCurrentResponseId(null);
    setCurrentResponseLiked(false);
    setLikePending(false);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      runPocketDad(trimmed, toneValue, intensityValue, selectedChild, situationId, {
        contextAnswers: appliedContext,
      });
    }, 250);
  };

  const handleContextOptionToggle = useCallback(
    (stepId: ContextFlowStepId, value: string, multiSelect: boolean) => {
      setContextDraftAnswers((previous) => {
        const next: PocketDadContextAnswers = {
          location: previous.location,
          urgency: previous.urgency,
          triedStrategies: [...previous.triedStrategies],
        };

        if (stepId === "triedStrategies" || multiSelect) {
          const exists = next.triedStrategies.includes(value);
          next.triedStrategies = exists
            ? next.triedStrategies.filter((strategy) => strategy !== value)
            : [...next.triedStrategies, value];
          return next;
        }

        if (stepId === "location") {
          next.location = previous.location === value ? null : value;
        }

        if (stepId === "urgency") {
          next.urgency = previous.urgency === value ? null : value;
        }

        return next;
      });
    },
    []
  );

  const resetContextFlow = useCallback(() => {
    setContextModalOpen(false);
    setContextStepIndex(0);
    setPendingSubmission(null);
  }, []);


  const handleContextFlowClose = useCallback(() => {
    setContextDraftAnswers(cloneContextAnswers(contextAnswers));
    resetContextFlow();
  }, [contextAnswers, resetContextFlow]);

  const handleContextFlowSkip = useCallback(() => {
    if (!pendingSubmission) {
      handleContextFlowClose();
      return;
    }

    const submission = pendingSubmission;
    const skipped = cloneContextAnswers(DEFAULT_CONTEXT_ANSWERS);
    setContextAnswers(skipped);
    setContextDraftAnswers(cloneContextAnswers(skipped));
    resetContextFlow();
    executePromptSubmission(
      submission.prompt,
      submission.tone,
      submission.toneIntensity,
      skipped,
      submission.situationId
    );
  }, [executePromptSubmission, handleContextFlowClose, pendingSubmission, resetContextFlow]);

  const handleContextNext = useCallback(() => {
    setContextStepIndex((current) => Math.min(current + 1, contextFlow.length - 1));
  }, []);

  const handleContextBack = useCallback(() => {
    setContextStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const handleContextFlowComplete = useCallback(() => {
    if (!pendingSubmission) {
      handleContextFlowClose();
      return;
    }

    const submission = pendingSubmission;
    const merged = cloneContextAnswers(contextDraftAnswers);
    setContextAnswers(merged);
    setContextDraftAnswers(cloneContextAnswers(merged));
    resetContextFlow();
    executePromptSubmission(
      submission.prompt,
      submission.tone,
      submission.toneIntensity,
      merged,
      submission.situationId
    );
  }, [contextDraftAnswers, executePromptSubmission, handleContextFlowClose, pendingSubmission, resetContextFlow]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleToneChange = (nextTone: Tone) => {
    if (tone === nextTone) return;
    const previousTone = tone;
    const resetIntensity = DEFAULT_TONE_INTENSITY;
    setTone(nextTone);
    setToneIntensity(resetIntensity);
    persistTonePreferences(nextTone, resetIntensity);

    if (!latestPrompt && !latestSituationId) return;

    const trimmedPrompt = latestPrompt.trim();
    const activeSituationId = latestSituationId ?? selectedSituationId ?? null;
    const key = cacheKeyFor(
      trimmedPrompt,
      nextTone,
      resetIntensity,
      selectedChild?.id ?? null,
      contextAnswers,
      activeSituationId,
      null
    );
    const cached = cacheRef.current.get(key);
    if (cached) {
      const previousHistory = getHistoryForChild(selectedChild?.id ?? null);
      const cachedHistory = [
        ...previousHistory,
        {
          prompt: trimmedPrompt,
          tone: nextTone,
          responseId: cached.responseId ?? null,
          liked: cached.liked ?? false,
          raw: cached.raw,
          answer: cached.answer,
          timestamp: Date.now(),
          variant: cached.variant ?? "original",
          pivotReason: cached.pivotReason ?? null,
          situationId: activeSituationId,
        },
      ];
      setCurrentAnswer(cached.answer);
      setError(null);
      setLoading(false);
      setCurrentResponseId(cached.responseId ?? null);
      setCurrentResponseLiked(cached.liked ?? false);
      setLikePending(false);
      setCurrentStrategyVariant(cached.variant ?? "original");
      setCurrentPivotReason(cached.pivotReason ?? null);
      updateStoredEntry(selectedChild?.id ?? null, {
        prompt: prompt,
        tone: nextTone,
        toneIntensity: resetIntensity,
        childId: selectedChild?.id ?? null,
        latestPrompt: trimmedPrompt,
        latestSituationId: activeSituationId,
        answer: cached.answer,
        raw: cached.raw,
        responseId: cached.responseId ?? null,
        liked: cached.liked ?? false,
        history: cachedHistory,
        variant: cached.variant ?? "original",
        pivotReason: cached.pivotReason ?? null,
        contextAnswers,
      });
      if (!viewedKeysRef.current.has(key)) {
        viewedKeysRef.current.add(key);

      }
      warmToneCache(trimmedPrompt, nextTone, selectedChild, contextAnswers, activeSituationId);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    setCurrentAnswer(null);
    setLoading(true);
    setCurrentResponseId(null);
    setCurrentResponseLiked(false);
    setLikePending(false);
    const previousHistory = getHistoryForChild(selectedChild?.id ?? null);
    const pendingHistory = [
      ...previousHistory,
      {
        prompt: trimmedPrompt,
        tone: nextTone,
        responseId: null,
        liked: false,
        raw: null,
        answer: null,
        timestamp: Date.now(),
        variant: "original",
        pivotReason: null,
        situationId: activeSituationId,
      },
    ];
    updateStoredEntry(selectedChild?.id ?? null, {
      prompt: prompt,
      tone: nextTone,
      toneIntensity: resetIntensity,
      childId: selectedChild?.id ?? null,
      latestPrompt: trimmedPrompt,
      latestSituationId: activeSituationId,
      answer: null,
      raw: null,
      responseId: null,
      liked: false,
      history: pendingHistory,
      variant: "original",
      pivotReason: null,
      contextAnswers,
    });
    setCurrentStrategyVariant("original");
    setCurrentPivotReason(null);
    setPivotSelection(null);
    runPocketDad(trimmedPrompt, nextTone, resetIntensity, selectedChild, activeSituationId, {
      contextAnswers,
    });
  };

  useEffect(() => {
    setQuickScenarioPulse(true);
  }, []);

  useFocusEffect(useCallback(() => {
    fetchChildren();
  }, [user?.id]))

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem("hd.onboarding.completed");
        setShowOnboarding(value !== "1");
      } catch {
        setShowOnboarding(true);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initForUser = async () => {
      const previousId = previousUserIdRef.current;

      if (!user?.id) {
        if (previousId) {
          await AsyncStorage.removeItem(storageKeyForUser(previousId));
        }
        previousUserIdRef.current = null;
        storedDataRef.current = { lastChildId: null, entries: {} };
        storageInitializedRef.current = false;
        cacheRef.current.clear();
        prefetchingRef.current.clear();
        viewedKeysRef.current.clear();
        setPrompt("");
        setLatestPrompt("");
        setSelectedSituationId(DEFAULT_SITUATION_ID);
        setLatestSituationId(DEFAULT_SITUATION_ID);
        setCurrentAnswer(null);
        setError(null);
        setLoading(false);
        setCurrentResponseId(null);
        setCurrentResponseLiked(false);
        setLikePending(false);
        setPromptHistory([]);
        setPivotModalOpen(false);
        setPivotSelection(null);
        setCurrentStrategyVariant("original");
        setCurrentPivotReason(null);
        setContextAnswers(cloneContextAnswers(DEFAULT_CONTEXT_ANSWERS));
        setContextDraftAnswers(cloneContextAnswers(DEFAULT_CONTEXT_ANSWERS));
        setContextModalOpen(false);
        setContextStepIndex(0);
        setPendingSubmission(null);
        setQuickScenarioPulse(false);
        return;
      }

      if (previousId && previousId !== user.id) {
        await AsyncStorage.removeItem(storageKeyForUser(previousId));
      }

      previousUserIdRef.current = user.id;

      const stored = await readStoredPocketDadData(user.id);
      if (cancelled) return;

      storedDataRef.current = {
        lastChildId: stored.lastChildId,
        entries: { ...stored.entries },
      };

      cacheRef.current = new Map();
      prefetchingRef.current.clear();
      Object.values(storedDataRef.current.entries).forEach((entry) => {
        if (entry.answer && entry.latestPrompt) {
          const key = cacheKeyFor(
            entry.latestPrompt,
            entry.tone,
            entry.toneIntensity,
            entry.childId,
            entry.contextAnswers,
            entry.latestSituationId ?? entry.selectedSituationId ?? null,
            entry.pivotReason ?? null
          );
          const raw = entry.raw ?? JSON.stringify(entry.answer);
          if (!raw) return;
          cacheRef.current.set(key, {
            answer: entry.answer,
            raw,
            responseId: entry.responseId ?? null,
            liked: entry.liked ?? false,
            variant: entry.variant ?? "original",
            pivotReason: entry.pivotReason ?? null,
          });
        }
      });

      storageInitializedRef.current = false;
    };

    initForUser();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return null;

    const today = new Date();
    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) return null;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age -= 1;
    }

    return age;
  };

  const getChildImageUrl = async (imagePath: string | null) => {
    if (!imagePath) return "";

    try {
      const { data, error: storageError } = await supabase.storage
        .from("child-images")
        .createSignedUrl(imagePath, 3600);

      if (storageError) {
        console.error("Error creating signed URL", storageError);
        return "";
      }

      return data?.signedUrl ?? "";
    } catch (storageError) {
      console.error("Error fetching child image URL", storageError);
      return "";
    }
  };

  const fetchChildren = async () => {
    try {
      const baseQuery = supabase
        .from("children")
        .select("id, name, birthdate, image_path, profile_note")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true });

      const { data, error: fetchError } = await baseQuery;

      let rows = data;
      if (fetchError) {
        const message =
          typeof fetchError.message === "string"
            ? fetchError.message.toLowerCase()
            : "";
        if (message.includes("profile_note")) {
          const fallback = await supabase
            .from("children")
            .select("id, name, birthdate, image_path")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: true });

          if (fallback.error) {
            throw fallback.error;
          }

          rows = fallback.data;
        } else {
          throw fetchError;
        }
      }

      const childProfiles: ChildProfile[] = [];

      if (rows) {
        for (const child of rows) {
          const image = await getChildImageUrl(child.image_path);
          const computedAge = calculateAge(child.birthdate ?? null);
          childProfiles.push({
            id: child.id,
            name: child.name ?? "",
            age: computedAge,
            ageLabel: buildAgeLabel(computedAge),
            image,
            profileNote: (child as { profile_note?: string | null })
              .profile_note ?? null,
          });
        }
      }

      setChildren(childProfiles);
      setSelectedChild((previous) => {
        if (!childProfiles.length) {
          return null;
        }

        if (previous) {
          const existing = childProfiles.find(
            (child) => child.id === previous.id
          );
          if (existing) {
            return existing;
          }
        }

        return childProfiles[0];
      });
    } catch (fetchError) {
      console.error("Unable to load children", fetchError);
    }
  };

  useEffect(() => {
    let isMounted = true;
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated) {
      setShowSignupPrompt(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user?.id || storageInitializedRef.current) return;

    const storedChildId = storedDataRef.current.lastChildId;
    let activeChildId: string | null = storedChildId;

    if (activeChildId && !children.some((child) => child.id === activeChildId)) {
      activeChildId = null;
    }

    if (activeChildId) {
      const matched = children.find((child) => child.id === activeChildId) ?? null;
      if (matched && selectedChild?.id !== matched.id) {
        setSelectedChild(matched);
      }
    }

    const entry =
      storedDataRef.current.entries[childStorageKey(activeChildId)];
    const fallbackEntry =
      storedDataRef.current.entries[childStorageKey(null)];
    const hydratedEntry = entry ?? fallbackEntry;

    if (hydratedEntry) {
      const hydratedContext = cloneContextAnswers(hydratedEntry.contextAnswers);
      setPrompt(hydratedEntry.prompt);
      setLatestPrompt(hydratedEntry.latestPrompt);
      setSelectedSituationId(
        hydratedEntry.selectedSituationId ?? DEFAULT_SITUATION_ID
      );
      setLatestSituationId(
        hydratedEntry.latestSituationId ??
        hydratedEntry.selectedSituationId ??
        DEFAULT_SITUATION_ID
      );
      setCurrentAnswer(hydratedEntry.answer);
      setCurrentResponseId(hydratedEntry.responseId ?? null);
      setCurrentResponseLiked(hydratedEntry.liked ?? false);
      setLikePending(false);
      setPromptHistory(hydratedEntry.history ?? []);
      setCurrentStrategyVariant(hydratedEntry.variant ?? "original");
      setCurrentPivotReason(hydratedEntry.pivotReason ?? null);
      setContextAnswers(hydratedContext);
      setContextDraftAnswers(cloneContextAnswers(hydratedContext));
      if (hydratedEntry.answer) {
        setError(null);
        setLoading(false);
      }
      if (hydratedEntry.tone && tone !== hydratedEntry.tone) {
        setTone(hydratedEntry.tone);
      }
      if (
        hydratedEntry.toneIntensity &&
        toneIntensity !== hydratedEntry.toneIntensity
      ) {
        setToneIntensity(hydratedEntry.toneIntensity);
      }
    } else {
      setPromptHistory([]);
      setCurrentStrategyVariant("original");
      setCurrentPivotReason(null);
      setSelectedSituationId(DEFAULT_SITUATION_ID);
      setLatestSituationId(DEFAULT_SITUATION_ID);
      const resetContext = cloneContextAnswers(DEFAULT_CONTEXT_ANSWERS);
      setContextAnswers(resetContext);
      setContextDraftAnswers(cloneContextAnswers(resetContext));
    }

    storageInitializedRef.current = true;
  }, [children, selectedChild?.id, tone, toneIntensity, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setTone(DEFAULT_TONE);
      setToneIntensity(DEFAULT_TONE_INTENSITY);
      setArchetypeCategory(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("pocketdad_tone, pocketdad_tone_intensity, quiz_result")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          const message =
            typeof error.message === "string"
              ? error.message.toLowerCase()
              : "";
          if (
            !message.includes("pocketdad_tone") &&
            !message.includes("quiz_result")
          ) {
            console.warn("Unable to load pocket dad preferences", error);
          }
          return;
        }

        const storedTone = data?.pocketdad_tone as Tone | undefined;
        const storedToneIntensity =
          data?.pocketdad_tone_intensity as ToneIntensity | undefined;
        const rawQuizResult = data?.quiz_result as any;

        if (!cancelled) {
          if (storedTone && TONES.includes(storedTone)) {
            setTone(storedTone);
          }
          if (
            storedToneIntensity &&
            TONE_INTENSITIES.includes(storedToneIntensity)
          ) {
            setToneIntensity(storedToneIntensity);
          }

          setArchetypeCategory(deriveDadCategoryFromQuizResult(rawQuizResult));
        }
      } catch (toneError) {
        console.warn("Error loading pocket dad preferences", toneError);
        if (!cancelled) {
          setArchetypeCategory(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persistTonePreferences = async (
    nextTone: Tone,
    nextIntensity: ToneIntensity
  ) => {
    if (!user?.id) return;
    try {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          pocketdad_tone: nextTone,
          pocketdad_tone_intensity: nextIntensity,
        },
        { onConflict: "id" }
      );
    } catch (persistError) {
      console.warn("Unable to persist pocket dad tone", persistError);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);


  const currentChildSummary = selectedChild
    ? {
      id: selectedChild.id,
      name: selectedChild.name,
      ageLabel: selectedChild.ageLabel,
      profileNote: selectedChild.profileNote,
      avatarUrl: selectedChild.image,
    }
    : null;

  const cardError = currentAnswer ? error : error === FALLBACK_ERROR ? error : null;

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        className="flex-1"
        behavior="position"
        enabled
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={{ flexGrow: 1 }}
          className="bg-[#1A2332] relative mx-auto w-full max-w-4xl pb-16">
          <View className="relative overflow-hidden bg-[#1A2332] px-4 py-8 text-white sm:px-12">
            {archetypeCategory ? (
              <ArchetypeBadge
                category={archetypeCategory}
                className="absolute right-6 top-6 sm:right-10 sm:top-8"
              />
            ) : null}

            <View className="items-center">
              <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Coaching tool
              </Text>
              <Text className="mt-2 font-serif text-4xl font-semibold text-white">
                Pocket Dad
              </Text>
              <Text className="mt-2 text-sm text-white/70">
                Think it through before you talk.
              </Text>

              {children.length > 0 ? (
                <View className="mt-6 flex flex-row flex-wrap items-start justify-center gap-6">
                  {children.map((child) => {
                    const isSelected = child.id === selectedChild?.id;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => {
                          setSelectedChild(child);
                          setError(null);
                        }}
                        className={[
                          "flex w-40 flex-col gap-2 rounded-2xl border p-4 text-left transition",
                          "focus:outline-none",
                          isSelected
                            ? "border-[#C59A5F] bg-white/5"
                            : "border-white/10 bg-white/0",
                        ].join(" ")}
                      >
                        <View className="flex flex-row items-center gap-3">
                          <View className="h-12 w-12 overflow-hidden rounded-full border border-white/20">
                            {child.image ? (
                              <Image
                                source={{ uri: child.image }}
                                className="h-full w-full"
                                resizeMode="cover"
                              />
                            ) : (
                              <View className="h-full w-full bg-white/10" />
                            )}
                          </View>
                          <View>
                            <Text className="text-sm font-semibold text-white">
                              {child.name}
                            </Text>
                            <Text className="text-xs uppercase tracking-wide text-white/60">
                              {child.ageLabel}
                            </Text>
                          </View>
                        </View>
                        {child.profileNote ? (
                          <Text className="text-xs text-white/70">
                            {child.profileNote}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text className="mt-6 text-sm text-white/60">
                  Add a child profile to personalize Pocket Dad’s advice.
                </Text>
              )}
            </View>

            <View className="mt-8 space-y-4">
              <TextInput
                style={{ height: 80 }}
                ref={promptInputRef}
                value={prompt}
                onChangeText={(value) => {
                  if (promptForSignup()) {
                    return;
                  }
                  setPrompt(value);
                  lastQuickScenarioRef.current = null;
                }}
                onFocus={() => {
                  if (promptForSignup()) {
                    promptInputRef.current?.blur();
                  }
                }}
                placeholder="Explain what's happening and we can work through it."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={9}
                editable={isAuthenticated}
                className="mt-1 px-6 w-full rounded-xl border-0 bg-white/10 p-4 text-base text-white ring-1 ring-white/10"
              />

              <View className="w-full mt-2 mx-auto flex flex-row items-center justify-center gap-3">
                <Pressable
                  onPress={handleEngageClick}
                  disabled={loading}
                  className={[
                    "flex flex-1 h-11 flex-row items-center justify-center rounded-full bg-[#C59A5F] px-12 text-sm font-semibold uppercase tracking-wide text-white transition",
                    loading ? "opacity-70" : "",
                  ].join(" ")}
                >
                  <Text className="text-sm font-semibold uppercase tracking-wide text-white">
                    {loading ? "Engaging…" : "Engage Dad Brain"}
                  </Text>
                </Pressable>

                <Pressable
                  style={{ justifySelf: "end" }}
                  onPress={() => setShowHow(true)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70">
                  <Ionicons name="information-circle" size={20} color={"white"} />
                </Pressable>

              </View>
            </View>

            <View className="mt-6 min-h-[1.25rem]">
              {error && !cardError ? (
                <Text className="text-sm text-rose-300">{error}</Text>
              ) : null}
            </View>

            <View className="mt-0">
              <AnswerCard
                tone={tone}
                onToneChange={handleToneChange}
                answer={currentAnswer}
                loading={loading && !currentAnswer}
                child={currentChildSummary}
                error={cardError}
                onRetry={() => {
                  if (!latestPrompt && !latestSituationId) return;
                  executePromptSubmission(
                    latestPrompt,
                    tone,
                    toneIntensity,
                    contextAnswers,
                    latestSituationId ?? selectedSituationId ?? null
                  );
                }}
                onLike={currentAnswer ? handleLikeCurrent : undefined}
                liked={currentResponseLiked}
                likeDisabled={!currentResponseId || likePending || loading}
                likePending={likePending}
                onPivot={currentAnswer ? handlePivotOpen : undefined}
                pivotPending={Boolean(pivotSelection)}
                pivotDisabled={loading}
                onRecordLater={currentAnswer ? handleRecordLater : undefined}
              />
            </View>

            <Text className="mt-10 text-center text-xs uppercase tracking-[0.3em] text-white/30">
              Powered by Hey Dad AI
            </Text>
          </View>
        </ScrollView>

      </KeyboardAvoidingView>


      <ContextFlowModal
        open={contextModalOpen}
        steps={contextFlow}
        activeStep={contextStepIndex}
        answers={contextDraftAnswers}
        pendingPrompt={pendingSubmission?.prompt ?? null}
        onOptionToggle={handleContextOptionToggle}
        onBack={handleContextBack}
        onNext={handleContextNext}
        onClose={handleContextFlowClose}
        onComplete={handleContextFlowComplete}
        onSkip={handleContextFlowSkip}
      />

      <HowItWorksModal open={showHow} onClose={() => setShowHow(false)} />
      {
        showOnboarding ? (
          <View className="absolute inset-0 z-50 bg-[#0f1625]/90">
            <Onboarding onComplete={handleOnboardingComplete} />
          </View>
        ) : null
      }

      <PocketDadSignupModal open={showSignupPrompt} onClose={() => setShowSignupPrompt(false)} />

      <RecordLaterModal
        open={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        defaultTitle={recordDefaults.title}
        defaultMilestone={recordDefaults.milestone}
        onConfirm={handleRecordConfirm} />

      <PivotModal
        open={pivotModalOpen}
        flow={pivotFlow}
        selectedOptionId={pivotSelection}
        onClose={handlePivotCancel}
        onSelect={handlePivotSelect}
      />
    </>
  );
}
