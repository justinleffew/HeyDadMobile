export type MultiChoice =
  | "calm_patient"
  | "direct_efficient"
  | "playful_light"
  | "thoughtful_reflective"
  | "unsure"
  | "what_to_say"
  | "staying_calm"
  | "teaching_lessons"
  | "building_habits"
  | "add_humor"
  | "gentle"
  | "direct"
  | "balanced"
  | "humor_when_fits";

export const ONBOARDING_VERSION = 1;

export interface OnboardingAnswers {
  parenting_style: (
    | "calm_patient"
    | "direct_efficient"
    | "playful_light"
    | "thoughtful_reflective"
    | "unsure"
  )[]; // 1–2
  deescalation_first_move: string; // 3–160 chars
  legacy_anchor: string; // 3–160 chars
  priority_help_types: (
    | "what_to_say"
    | "staying_calm"
    | "teaching_lessons"
    | "building_habits"
    | "add_humor"
  )[]; // 1–2
  advice_tone: ("gentle" | "direct" | "balanced" | "humor_when_fits")[]; // 1–2
  // system fields
  completed_at_iso?: string;
  version: number; // bump on content changes
}

export const DEFAULTS: OnboardingAnswers = {
  parenting_style: ["balanced" as unknown as OnboardingAnswers["parenting_style"][number]],
  deescalation_first_move: "Take a breath, connect, then coach.",
  legacy_anchor: "Present, fair, and fun.",
  priority_help_types: ["what_to_say"],
  advice_tone: ["balanced"],
  version: ONBOARDING_VERSION,
};

const within = (min: number, max: number) => (n: number) => n >= min && n <= max;

export const validateMulti = (arr: unknown[], min = 1, max = 2) =>
  Array.isArray(arr) && within(min, max)(arr.length);

export const validateShort = (s: string, min = 3, max = 160) => {
  const t = (s ?? "").trim();
  return t.length >= min && t.length <= max;
};

export type MultiQuestionKey =
  | "parenting_style"
  | "priority_help_types"
  | "advice_tone";

export type TextQuestionKey = "deescalation_first_move" | "legacy_anchor";

export type OnboardingQuestionKey =
  | MultiQuestionKey
  | TextQuestionKey;

type BaseQuestion = {
  id: OnboardingQuestionKey;
  title: string;
  subtitle: string;
};

type MultiQuestion = BaseQuestion & {
  id: MultiQuestionKey;
  type: "multi";
  helperText: string;
  options: { id: MultiChoice; label: string }[];
};

type TextQuestion = BaseQuestion & {
  id: TextQuestionKey;
  type: "text";
  placeholder?: string;
  helperText?: string;
};

export type OnboardingQuestion = MultiQuestion | TextQuestion;

export const ONBOARDING_FLOW: OnboardingQuestion[] = [
  {
    id: "parenting_style",
    type: "multi",
    title: "How would you describe your parenting style?",
    subtitle: "Pick up to two.",
    helperText: "Choose your parenting style",
    options: [
      { id: "calm_patient", label: "Calm and patient" },
      { id: "direct_efficient", label: "Direct and no-nonsense" },
      { id: "playful_light", label: "Playful and lighthearted" },
      { id: "thoughtful_reflective", label: "Thoughtful and reflective" },
      { id: "unsure", label: "Still figuring it out" },
    ],
  },
  {
    id: "deescalation_first_move",
    type: "text",
    title: "When your kid is upset, what's your first move?",
    subtitle: "Short answer.",
    placeholder: "What's your go-to first move when things get heated?",
    helperText:
      "E.g., explain what's wrong, walk away, joke to break tension, hug first.",
  },
  {
    id: "legacy_anchor",
    type: "text",
    title: "What do you most want your kids to remember about you?",
    subtitle: "Short answer.",
  },
  {
    id: "priority_help_types",
    type: "multi",
    title: "What help do you want most from Pocket Dad?",
    subtitle: "Pick up to two.",
    helperText: "Pick up to two.",
    options: [
      { id: "what_to_say", label: "What to say in tough moments" },
      { id: "staying_calm", label: "Staying calm and patient" },
      { id: "teaching_lessons", label: "Teaching life lessons" },
      { id: "building_habits", label: "Encouraging good habits" },
      { id: "add_humor", label: "Bringing humor back into parenting" },
    ],
  },
  {
    id: "advice_tone",
    type: "multi",
    title: "How should Pocket Dad talk to you?",
    subtitle: "Pick up to two.",
    helperText: "Pick up to two.",
    options: [
      { id: "gentle", label: "Gentle and understanding" },
      { id: "direct", label: "Direct and efficient" },
      { id: "balanced", label: "Balanced — tell it straight, but kind" },
      { id: "humor_when_fits", label: "Add some humor when it fits" },
    ],
  },
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_FLOW.length;

export const ONBOARDING_STORAGE_KEY = "hd.onboarding.answers.v1";

export const MAX_MULTI_SELECTION = 2;
