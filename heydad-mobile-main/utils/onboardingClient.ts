import type { PostgrestError } from "@supabase/supabase-js";

import type { ArchetypeScores, DadCategory } from "../utils/archetype";

// import { OnboardingKey } from "@/hey-dad/onboardingKeys";
import { supabase } from "./supabase";

const OnboardingKeys = {
  ParentingStyle: "dad_parenting_style",
  FirstMoveWhenUpset: "dad_first_move_when_upset",
  WhatKidsRemember: "dad_what_kids_remember",
  HelpFromPocketDad: "dad_help_from_pocketdad",
  PocketDadTone: "dad_style_default",
} as const;

type OnboardingKey = (typeof OnboardingKeys)[keyof typeof OnboardingKeys];

export type QuizResultPayload = {
  version: number;
  completed_at_iso: string;
  parenting_style: string[];
  deescalation_first_move: string;
  legacy_anchor: string;
  priority_help_types: string[];
  advice_tone: string[];
  computed_archetype?: {
    category: DadCategory;
    scores: ArchetypeScores;
    version: number;
    source: "onboarding_v1";
  };
};

type RawQuizResult = Partial<QuizResultPayload> | null;

export type UpsertAnswerOptions = {
  child_id?: string | null;
  answer_short?: string | null;
  answer_json?: unknown;
};

const questionIdCache = new Map<OnboardingKey, string | number>();

async function getQuestionId(key: OnboardingKey): Promise<string | number> {
  if (questionIdCache.has(key)) {
    return questionIdCache.get(key)!;
  }

  const { data: question, error } = await supabase
    .from("onboarding_questions")
    .select("id")
    .eq("key", key)
    .eq("is_active", true)
    .single();

  if (error) throw error;
  if (question?.id === undefined || question.id === null) {
    throw new Error(`Onboarding question not found for key: ${key}`);
  }

  questionIdCache.set(key, question.id);
  return question.id;
}

async function getUserId(): Promise<string> {

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) throw new Error("No auth user");
  return session?.user?.id;
}

export async function upsertAnswer(key: OnboardingKey, opts: UpsertAnswerOptions) {
  const questionId = await getQuestionId(key);
  const userId = await getUserId();

  const { error } = await supabase
    .from("onboarding_responses")
    .upsert(
      {
        user_id: userId,
        child_id: opts.child_id ?? null,
        question_id: questionId,
        answer_short: opts.answer_short ?? null,
        answer_json: opts.answer_json ?? null,
      },
      { onConflict: "user_id,child_id,question_id" },
    );

  if (error) throw error;
}

export async function fetchQuizResult(): Promise<RawQuizResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("quiz_result")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  return (data?.quiz_result ?? null) as RawQuizResult;
}

function coerceIsoTimestamp(value: string | undefined | null, fallback: string) {
  if (!value) return fallback;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return new Date(parsed).toISOString();
}

function includesColumnName(value: string | undefined, column: string) {
  if (!value) return false;
  return value.toLowerCase().includes(column.toLowerCase());
}

function isMissingColumnError(error: PostgrestError | null, column: string) {
  if (!error) return false;

  const haystacks = [
    error.message,
    error.details,
    error.hint,
    typeof error.code === "string" ? error.code : undefined,
  ];

  if (haystacks.some((value) => includesColumnName(value, column))) {
    return haystacks.some((value) =>
      typeof value === "string" && value.toLowerCase().includes("column"),
    );
  }

  const serialized = JSON.stringify(error).toLowerCase();
  return serialized.includes(column.toLowerCase()) && serialized.includes("column");
}

async function updateQuizMetadata(
  userId: string,
  quizResult: QuizResultPayload,
  completedAt: string,
) {
  const baseUpdate = {
    quiz_result: quizResult,
    quiz_completed_at: completedAt,
  } as const;

  const { error } = await supabase
    .from("profiles")
    .update(baseUpdate)
    .eq("id", userId);

  if (!error) return;

  if (!isMissingColumnError(error, "quiz_completed_at")) {
    throw error;
  }

  const fallbackUpdate = {
    quiz_result: quizResult,
  } as const;

  const { error: retryError } = await supabase
    .from("profiles")
    .update(fallbackUpdate)
    .eq("id", userId);

  if (retryError) throw retryError;
}

async function insertQuizMetadata(
  payload: {
    id: string;
    full_name: string;
    email: string | null;
  },
  quizResult: QuizResultPayload,
  completedAt: string,
) {
  const insertPayload = {
    ...payload,
    quiz_result: quizResult,
    quiz_completed_at: completedAt,
  };

  const { error } = await supabase.from("profiles").insert(insertPayload);

  if (!error) return;

  if (!isMissingColumnError(error, "quiz_completed_at")) {
    throw error;
  }

  const fallbackInsert = {
    ...payload,
    quiz_result: quizResult,
  };

  const { error: retryError } = await supabase
    .from("profiles")
    .insert(fallbackInsert);

  if (retryError) throw retryError;
}

export async function finalizeOnboarding(result: QuizResultPayload) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user?.id) throw new Error("No auth user");

  const userId = user.id;
  const { error } = await supabase.rpc("set_default_preferences_from_onboarding", {
    p_user: userId,
  });

  if (error) throw error;

  const nowIso = new Date().toISOString();
  const completedAt = coerceIsoTimestamp(result.completed_at_iso, nowIso);
  const baseQuizResult = {
    version: result.version,
    completed_at_iso: completedAt,
    parenting_style: result.parenting_style ?? [],
    deescalation_first_move: result.deescalation_first_move ?? "",
    legacy_anchor: result.legacy_anchor ?? "",
    priority_help_types: result.priority_help_types ?? [],
    advice_tone: result.advice_tone ?? [],
  } as const;

  const quizResult: QuizResultPayload = result.computed_archetype
    ? {
      ...baseQuizResult,
      computed_archetype: {
        category: result.computed_archetype.category,
        scores: result.computed_archetype.scores,
        version: result.computed_archetype.version,
        source: result.computed_archetype.source,
      },
    }
    : baseQuizResult;

  const { data: profileRow, error: fetchProfileError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (fetchProfileError) throw fetchProfileError;

  if (profileRow) {
    await updateQuizMetadata(userId, quizResult, completedAt);
    return;
  }

  const fallbackName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : typeof user.user_metadata?.first_name === "string"
          ? user.user_metadata.first_name
          : "";

  await insertQuizMetadata(
    {
      id: userId,
      full_name: fallbackName,
      email: user.email ?? null,
    },
    quizResult,
    completedAt,
  );
}
