import { ONBOARDING_VERSION } from "../data/onboarding";
import type { OnboardingAnswers } from "../data/onboarding";

export type DadCategory =
  | "coach_dad"
  | "calm_anchor_dad"
  | "fun_dad"
  | "thoughtful_dad"
  | "builder_dad"
  | "balanced_dad";

export type ArchetypeScores = Record<DadCategory, number>;

export const ARCHETYPE_VERSION = 1 as const;

const initScores = (): ArchetypeScores => ({
  coach_dad: 0,
  calm_anchor_dad: 0,
  fun_dad: 0,
  thoughtful_dad: 0,
  builder_dad: 0,
  balanced_dad: 0,
});

const bump = (scores: ArchetypeScores, cat: DadCategory, n = 1) => {
  scores[cat] += n;
};

const includesWord = (s: string, words: string[]) =>
  words.some((w) => s.toLowerCase().includes(w));

export const DAD_CATEGORY_LABEL: Record<DadCategory, string> = {
  coach_dad: "Coach Dad",
  calm_anchor_dad: "Calm Anchor Dad",
  fun_dad: "Fun Dad",
  thoughtful_dad: "Thoughtful Dad",
  builder_dad: "Builder Dad",
  balanced_dad: "Balanced Dad",
} as const;

export const DAD_CATEGORY_COLOR: Record<DadCategory, string> = {
  coach_dad: "#1E88E5",
  calm_anchor_dad: "#26A69A",
  fun_dad: "#FB8C00",
  thoughtful_dad: "#8E24AA",
  builder_dad: "#5E6AD2",
  balanced_dad: "#546E7A",
} as const;

export function isDadCategory(value: unknown): value is DadCategory {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(DAD_CATEGORY_LABEL, value)
  );
}

const PARENTING_STYLE_OPTIONS = [
  "calm_patient",
  "direct_efficient",
  "playful_light",
  "thoughtful_reflective",
  "unsure",
] as const satisfies readonly OnboardingAnswers["parenting_style"][number][];

const PRIORITY_HELP_OPTIONS = [
  "what_to_say",
  "staying_calm",
  "teaching_lessons",
  "building_habits",
  "add_humor",
] as const satisfies readonly OnboardingAnswers["priority_help_types"][number][];

const ADVICE_TONE_OPTIONS = [
  "gentle",
  "direct",
  "balanced",
  "humor_when_fits",
] as const satisfies readonly OnboardingAnswers["advice_tone"][number][];

const hasSignals = (answers: {
  parenting_style: readonly unknown[];
  priority_help_types: readonly unknown[];
  advice_tone: readonly unknown[];
  deescalation_first_move: string;
  legacy_anchor: string;
}) => {
  if (answers.parenting_style.length > 0) return true;
  if (answers.priority_help_types.length > 0) return true;
  if (answers.advice_tone.length > 0) return true;
  if (answers.deescalation_first_move.length > 0) return true;
  if (answers.legacy_anchor.length > 0) return true;
  return false;
};

function filterOptions<T extends string>(
  value: unknown,
  options: readonly T[],
): T[] {
  if (!Array.isArray(value)) return [];
  const optionSet = new Set(options);
  return value.filter(
    (opt): opt is T => typeof opt === "string" && optionSet.has(opt as T),
  );
}

type QuizResultLike = {
  parenting_style?: unknown;
  priority_help_types?: unknown;
  advice_tone?: unknown;
  deescalation_first_move?: unknown;
  legacy_anchor?: unknown;
  computed_archetype?: { category?: unknown } | null;
  version?: unknown;
  completed_at_iso?: unknown;
} | null | undefined;

export function deriveDadCategoryFromQuizResult(
  quizResult: QuizResultLike,
): DadCategory | null {
  if (!quizResult || typeof quizResult !== "object") {
    return null;
  }

  const payload = quizResult as Exclude<QuizResultLike, null | undefined>;

  const storedCategory = payload.computed_archetype?.category;
  if (isDadCategory(storedCategory)) {
    return storedCategory;
  }

  const parenting_style = filterOptions(payload.parenting_style, PARENTING_STYLE_OPTIONS);
  const priority_help_types = filterOptions(
    payload.priority_help_types,
    PRIORITY_HELP_OPTIONS,
  );
  const advice_tone = filterOptions(payload.advice_tone, ADVICE_TONE_OPTIONS);
  const deescalation_first_move =
    typeof payload.deescalation_first_move === "string"
      ? payload.deescalation_first_move.trim()
      : "";
  const legacy_anchor =
    typeof payload.legacy_anchor === "string" ? payload.legacy_anchor.trim() : "";

  if (
    !hasSignals({
      parenting_style,
      priority_help_types,
      advice_tone,
      deescalation_first_move,
      legacy_anchor,
    })
  ) {
    return null;
  }

  const answers: OnboardingAnswers = {
    parenting_style,
    priority_help_types,
    advice_tone,
    deescalation_first_move,
    legacy_anchor,
    completed_at_iso:
      typeof payload.completed_at_iso === "string" ? payload.completed_at_iso : undefined,
    version:
      typeof payload.version === "number" ? payload.version : ONBOARDING_VERSION,
  };

  try {
    return scoreOnboarding(answers).category;
  } catch (error) {
    console.warn("Unable to derive dad category from quiz result", error);
    return null;
  }
}

export function scoreOnboarding(answers: OnboardingAnswers) {
  const scores = initScores();
  const signals = new Map<DadCategory, Set<string>>([
    ["coach_dad", new Set()],
    ["calm_anchor_dad", new Set()],
    ["fun_dad", new Set()],
    ["thoughtful_dad", new Set()],
    ["builder_dad", new Set()],
    ["balanced_dad", new Set()],
  ]);
  const mark = (cat: DadCategory, key: string, n = 1) => {
    bump(scores, cat, n);
    signals.get(cat)!.add(key);
  };

  // parenting_style (strongest)
  for (const opt of answers.parenting_style ?? []) {
    if (opt === "calm_patient") mark("calm_anchor_dad", "parenting_style.calm", 2);
    if (opt === "direct_efficient") mark("coach_dad", "parenting_style.direct", 2);
    if (opt === "playful_light") mark("fun_dad", "parenting_style.playful", 2);
    if (opt === "thoughtful_reflective") mark("thoughtful_dad", "parenting_style.thoughtful", 2);
    if (opt === "unsure") mark("balanced_dad", "parenting_style.unsure", 1);
  }

  // priority_help_types
  for (const opt of answers.priority_help_types ?? []) {
    if (opt === "what_to_say") {
      mark("coach_dad", "priority.what_to_say", 1);
      mark("thoughtful_dad", "priority.what_to_say", 1);
    }
    if (opt === "staying_calm") mark("calm_anchor_dad", "priority.staying_calm", 2);
    if (opt === "teaching_lessons") mark("coach_dad", "priority.teaching_lessons", 2);
    if (opt === "building_habits") mark("builder_dad", "priority.building_habits", 2);
    if (opt === "add_humor") mark("fun_dad", "priority.add_humor", 2);
  }

  // advice_tone
  for (const opt of answers.advice_tone ?? []) {
    if (opt === "gentle") {
      mark("calm_anchor_dad", "tone.gentle", 1);
      mark("thoughtful_dad", "tone.gentle", 1);
    }
    if (opt === "direct") mark("coach_dad", "tone.direct", 2);
    if (opt === "balanced") mark("balanced_dad", "tone.balanced", 2);
    if (opt === "humor_when_fits") mark("fun_dad", "tone.humor", 2);
  }

  // tiny keyword bumps (tie-break helpers only)
  const move = (answers.deescalation_first_move ?? "").trim().toLowerCase();
  if (includesWord(move, ["breathe", "breath", "pause", "hug", "listen"])) {
    mark("calm_anchor_dad", "move.key", 1);
  }
  if (includesWord(move, ["explain", "teach", "lesson", "why"])) {
    mark("coach_dad", "move.key", 1);
  }
  if (includesWord(move, ["joke", "laugh", "smile"])) {
    mark("fun_dad", "move.key", 1);
  }

  const legacy = (answers.legacy_anchor ?? "").trim().toLowerCase();
  if (includesWord(legacy, ["kind", "fair", "patient", "present"])) {
    mark("calm_anchor_dad", "legacy.key", 1);
  }
  if (includesWord(legacy, ["hard work", "discipline", "grit", "character"])) {
    mark("coach_dad", "legacy.key", 1);
  }
  if (includesWord(legacy, ["fun", "joy", "play"])) {
    mark("fun_dad", "legacy.key", 1);
  }
  if (includesWord(legacy, ["values", "faith", "wisdom", "reflect"])) {
    mark("thoughtful_dad", "legacy.key", 1);
  }
  if (includesWord(legacy, ["habits", "consistency", "routine"])) {
    mark("builder_dad", "legacy.key", 1);
  }

  // pick winner with tie rules
  const entries = Object.entries(scores) as [DadCategory, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const topScore = entries[0][1];
  const topCats = entries.filter(([, n]) => n === topScore).map(([c]) => c);

  let winner: DadCategory;
  if (topCats.length === 1) {
    winner = topCats[0];
  } else {
    const weightOrder: DadCategory[] = [
      // favor those touched by parenting_style first
      ...[
        "coach_dad",
        "calm_anchor_dad",
        "fun_dad",
        "thoughtful_dad",
        "balanced_dad",
        "builder_dad",
      ],
    ];
    const bySource = (c: DadCategory) => {
      const s = [...(signals.get(c) ?? [])];
      const hasPS = s.some((k) => k.startsWith("parenting_style."));
      const featureCount = s.length;
      return { hasPS, featureCount };
    };
    winner = topCats
      .map((c) => ({ c, ...bySource(c) }))
      .sort(
        (a, b) =>
          Number(b.hasPS) - Number(a.hasPS) ||
          b.featureCount - a.featureCount ||
          weightOrder.indexOf(a.c) - weightOrder.indexOf(b.c),
      )[0].c;
  }

  return {
    category: winner,
    scores,
    signals: Object.fromEntries(
      [...signals].map(([k, v]) => [k, [...v]]),
    ) as Record<DadCategory, string[]>,
    version: ARCHETYPE_VERSION,
    source: "onboarding_v1" as const,
  };
}
