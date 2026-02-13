export type StarterPrompt = {
  id: string;
  emoji: string;
  text: string;
  tier: 'starter';
  priority: true;
  order: number;
};

/**
 * Tier 1 — Curated Starter Prompts
 * Handpicked and shown first to every new dad before the general library.
 * These are ordered intentionally and should not be shuffled.
 */
export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'starter-bedtime-story',
    emoji: '\u{1F4D6}',
    text: 'Record yourself reading them their favorite bedtime story \u2014 trust us on this one',
    tier: 'starter',
    priority: true,
    order: 1,
  },
  {
    id: 'starter-day-they-were-born',
    emoji: '\u{1F389}',
    text: "Tell them about the day they were born (don't skip the funny parts)",
    tier: 'starter',
    priority: true,
    order: 2,
  },
  {
    id: 'starter-best-advice',
    emoji: '\u{1F4AA}',
    text: "What's the best advice you ever got? Pass it on.",
    tier: 'starter',
    priority: true,
    order: 3,
  },
  {
    id: 'starter-first-car',
    emoji: '\u{1F697}',
    text: 'Tell them about your first car \u2014 the whole truth',
    tier: 'starter',
    priority: true,
    order: 4,
  },
  {
    id: 'starter-first-time-held',
    emoji: '\u{2764}\u{FE0F}',
    text: 'Tell them what you felt the first time you held them',
    tier: 'starter',
    priority: true,
    order: 5,
  },
  {
    id: 'starter-what-makes-proud',
    emoji: '\u{1F31F}',
    text: 'What do you already see in them that makes you proud?',
    tier: 'starter',
    priority: true,
    order: 6,
  },
];
