export type PocketDadDemoLink = {
  label: string;
  url: string;
};

export type PocketDadAction = {
  title: string;
  content: string[];
  script: string | null;
  demo: PocketDadDemoLink | null;
};

export type PocketDadAlternative = {
  title: string;
  content: string[];
  script: string | null;
};

export type PocketDadAnswer = {
  primaryAction: PocketDadAction;
  alternatives: PocketDadAlternative[];
  insights: string[];
};

type UnknownRecord = Record<string, unknown>;

const TITLE_KEYS = ["title", "name", "headline", "heading"];
const CONTENT_KEYS = [
  "content",
  "details",
  "summary",
  "steps",
  "actions",
  "guidance",
  "whatToDo",
  "what_to_do",
  "body",
  "notes",
];
const SCRIPT_KEYS = ["script", "say", "phrase", "whatToSay", "words"];
const DEMO_KEYS = ["demo", "demoLink", "demoUrl", "demo_link", "demo_url", "link", "video"];

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.href;
  } catch {
    return null;
  }
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

function coerceStringArray(value: unknown, limit = 6): string[] {
  const pushString = (acc: string[], candidate: unknown) => {
    if (!candidate) return acc;
    if (typeof candidate === "string") {
      const collapsed = collapseWhitespace(candidate);
      if (collapsed) acc.push(collapsed);
    } else if (typeof candidate === "object") {
      const record = candidate as UnknownRecord;
      if (typeof record.text === "string") {
        const collapsed = collapseWhitespace(record.text);
        if (collapsed) acc.push(collapsed);
      }
    }
    return acc;
  };

  if (Array.isArray(value)) {
    return value.reduce<string[]>(pushString, []).slice(0, limit);
  }
  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((segment) => collapseWhitespace(segment))
      .filter(Boolean)
      .slice(0, limit);
  }
  return [];
}

function pickFirstString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = coerceString(record[key]);
    if (value) {
      return collapseWhitespace(value);
    }
  }
  return null;
}

function extractContent(record: UnknownRecord): string[] {
  for (const key of CONTENT_KEYS) {
    if (record[key] !== undefined) {
      const content = coerceStringArray(record[key]);
      if (content.length) {
        return content;
      }
    }
  }
  return [];
}

function extractScript(record: UnknownRecord): string | null {
  const script = pickFirstString(record, SCRIPT_KEYS);
  return script ? collapseWhitespace(script) : null;
}

function extractDemo(record: UnknownRecord): PocketDadDemoLink | null {
  for (const key of DEMO_KEYS) {
    const value = record[key];
    if (!value) continue;
    if (typeof value === "string") {
      const url = isHttpUrl(value);
      if (url) {
        return { label: "Show demo", url };
      }
    } else if (typeof value === "object") {
      const demoRecord = value as UnknownRecord;
      const urlCandidate = pickFirstString(demoRecord, ["url", "href", "link"]);
      if (urlCandidate) {
        const url = isHttpUrl(urlCandidate);
        if (!url) {
          continue;
        }
        const label = pickFirstString(demoRecord, ["label", "title", "text"]) ?? "Show demo";
        return { label, url };
      }
    }
  }
  return null;
}

function parseAction(raw: unknown, { allowDemo }: { allowDemo: boolean }): PocketDadAction | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as UnknownRecord;
  const title = pickFirstString(record, TITLE_KEYS);
  const content = extractContent(record);
  const script = extractScript(record);
  const demo = allowDemo ? extractDemo(record) : null;

  if (!title) {
    if (script) {
      const truncated = script.length > 80 ? `${script.slice(0, 77)}…` : script;
      return {
        title: truncated,
        content: [],
        script,
        demo,
      };
    }
    return null;
  }

  if (!content.length && !script) {
    return null;
  }

  return {
    title,
    content,
    script: script ?? null,
    demo,
  };
}

function coerceInsights(raw: unknown): string[] {
  if (!raw) return [];
  return coerceStringArray(raw, 6);
}

function parseFromRecord(record: UnknownRecord): PocketDadAnswer | null {
  const payload =
    record.coachingResponse && typeof record.coachingResponse === "object"
      ? (record.coachingResponse as UnknownRecord)
      : record;

  const primaryAction = parseAction(
    payload.primaryAction ?? payload.primary_action ?? payload.primary,
    { allowDemo: true }
  );
  if (!primaryAction) return null;

  const alternativesSource =
    payload.alternatives
    ?? payload.alternativeActions
    ?? payload.alternative_actions
    ?? payload.options
    ?? payload.secondaryActions;

  const alternatives: PocketDadAlternative[] = Array.isArray(alternativesSource)
    ? (alternativesSource as unknown[])
      .map((item) => {
        const parsed = parseAction(item, { allowDemo: false });
        if (!parsed) return null;
        return {
          title: parsed.title,
          content: parsed.content,
          script: parsed.script,
        };
      })
      .filter((item): item is PocketDadAlternative => Boolean(item))
    : [];

  const insights = coerceInsights(
    payload.insights
    ?? payload.insight
    ?? payload.takeaways
    ?? payload.why
    ?? payload.rationale
  );

  return { primaryAction, alternatives, insights };
}

export function parsePocketDad(raw: string): PocketDadAnswer {
  if (typeof raw !== "string") {
    throw new Error("format");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error("format");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("format");
  }

  const result = parseFromRecord(parsed as UnknownRecord);
  if (!result) {
    throw new Error("format");
  }

  return result;
}

export const isValidPocketDad = (value: string) => {
  try {
    parsePocketDad(value);
    return true;
  } catch {
    return false;
  }
};
