export type Tone = "gentle" | "calm" | "direct";
export type AgeGroup = "3-5" | "6-8" | "9-12";

export type SayThisItem = {
  moment: string;
  ageGroup: AgeGroup;
  responses: Record<Tone, string>;
  whyThisWorks: string;
  dadMove: string;
};

export const sayThisData: ReadonlyArray<SayThisItem> = [
  {
    moment: "Not listening / ignoring directions",
    ageGroup: "3-5",
    responses: {
      gentle:
        "I can tell you’re having fun, but when I ask you to do something, I need you to show me you heard me. Look at my eyes for a second so we can work together.",
      calm:
        "I’ve asked twice. I need you to stop and listen. When I talk, your job is to show you’re ready by looking and pausing.",
      direct: "Stop. Eyes here. You heard me say it’s time to clean up. Let’s do it now."
    },
    whyThisWorks:
      "Connect before correct; brief eye contact boosts cooperation and reduces power struggles.",
    dadMove: "Connect-Then-Direct"
  },
  {
    moment: "Not listening / ignoring directions",
    ageGroup: "6-8",
    responses: {
      gentle:
        "Seems like your brain’s still in play mode. Let’s switch gears. Pause and show me you heard. What’s the first thing you need to do right now?",
      calm: "I shouldn’t have to ask more than once. What did I just ask you to do?",
      direct:
        "You ignored me twice. That’s not okay. You can play again after you do what I asked."
    },
    whyThisWorks: "Asking for a repeat builds active listening and accountability without shame.",
    dadMove: "Say-Back Check"
  },
  {
    moment: "Not listening / ignoring directions",
    ageGroup: "9-12",
    responses: {
      gentle:
        "I know you’re busy, but when I talk to you, I expect first-time listening. It’s part of showing respect—the same way I listen when you talk.",
      calm:
        "When you don’t listen, it slows everyone down. I need follow-through without repeats. Can you handle that?",
      direct: "Last reminder. If I have to repeat myself again, you lose a privilege tonight."
    },
    whyThisWorks:
      "Preteens respond to fairness, consistency, and predictable follow-through.",
    dadMove: "First-Time Follow-Through"
  },

  // 2) Backtalk / disrespect
  {
    moment: "Backtalk / disrespect",
    ageGroup: "3-5",
    responses: {
      gentle:
        "I hear you’re upset, but talking like that isn’t how we fix it. Use calm words so I can understand what you need.",
      calm: "I don’t like the way you spoke. Take a breath and try again in a nicer voice.",
      direct: "Stop. That’s disrespectful. Talk kindly or the conversation ends."
    },
    whyThisWorks:
      "Separates emotion from behavior; models calm correction over power struggle.",
    dadMove: "Respect Reset"
  },
  {
    moment: "Backtalk / disrespect",
    ageGroup: "6-8",
    responses: {
      gentle:
        "You can be mad and still be respectful. Try that thought again with a calm voice and I’ll listen.",
      calm: "Let’s start over. Say what you need respectfully, then I’ll respond.",
      direct: "Watch your tone. Feelings are fine; disrespect isn’t."
    },
    whyThisWorks: "Teaches tone awareness and offers a quick do-over to rehearse respect.",
    dadMove: "Do-Over Door"
  },
  {
    moment: "Backtalk / disrespect",
    ageGroup: "9-12",
    responses: {
      gentle:
        "Hold up. You’re frustrated, but that crossed a line. Try again—make your point without disrespect.",
      calm:
        "You don’t have to agree with me, but you do have to be respectful. Want to restart?",
      direct:
        "If you talk to me like that again, the conversation ends and there’s a consequence."
    },
    whyThisWorks:
      "Defines a hard boundary while keeping room for assertive, civil disagreement.",
    dadMove: "Firm + Fair Line"
  },

  // 3) Hitting / hurting a sibling
  {
    moment: "Hitting / hurting a sibling",
    ageGroup: "3-5",
    responses: {
      gentle:
        "Hands aren’t for hitting. You’re mad, but hitting hurts. Sit with me until you’re calm, then we’ll make it right with gentle hands.",
      calm:
        "No hitting. Sit with me to cool down. Then check if your sibling is okay and show gentle touch.",
      direct: "Stop. Hitting isn’t okay. Sit for three minutes. After, we repair with gentle hands."
    },
    whyThisWorks: "Stops harm fast, names the rule, and requires simple repair—foundation for empathy.",
    dadMove: "Gentle-Hands Repair"
  },
  {
    moment: "Hitting / hurting a sibling",
    ageGroup: "6-8",
    responses: {
      gentle:
        "I see you’re upset, but hands are for safe touches. Cool down with me, then we’ll check on your sibling and plan a safer way.",
      calm:
        "Hitting stops now. Five-minute break, then repair: check on them and create a safer plan for next time.",
      direct:
        "Hands off. You’re benched from play. After an apology and a safety plan, you can rejoin."
    },
    whyThisWorks: "Links impulse control with repair; practice a replacement behavior.",
    dadMove: "Repair + Replace"
  },
  {
    moment: "Hitting / hurting a sibling",
    ageGroup: "9-12",
    responses: {
      gentle:
        "Even if you were provoked, violence isn’t it. Take ten minutes, then repair: apologize, hear their side, and plan how to handle it next time.",
      calm:
        "No physical aggression. Fifteen-minute removal. Return with a full repair and a conflict plan.",
      direct:
        "Hitting means you lose privileges until you make a complete repair and show it won’t happen again."
    },
    whyThisWorks: "Holds high accountability while teaching concrete conflict skills.",
    dadMove: "Full Accountability Loop"
  },

  // 4) Screen-time ending
  {
    moment: "Screen-time ending",
    ageGroup: "3-5",
    responses: {
      gentle:
        "The show is almost done. When it ends, we turn it off and play blocks. Do you want to push the button or should I?",
      calm:
        "One more minute, then it’s off. You can turn it off, or I will. Choose now.",
      direct:
        "Screen time is over. I’m turning it off now. If you make a fuss, no screen tomorrow."
    },
    whyThisWorks:
      "Heads-up + choice smooths transitions; firm follow-through prevents bargaining.",
    dadMove: "Power-Down Choice"
  },
  {
    moment: "Screen-time ending",
    ageGroup: "6-8",
    responses: {
      gentle:
        "Finish your level and shut it down. Want to press power, or me? What’s next—snack or outside?",
      calm:
        "Timer says screens are over. Turn it off now. Cooperate and you choose next activity; stall and you lose time tomorrow.",
      direct: "Time’s up. Power off now or lose tomorrow’s screen time. Your call."
    },
    whyThisWorks: "Predictable limits + small stakes build self-regulation.",
    dadMove: "Countdown Off-Ramp"
  },
  {
    moment: "Screen-time ending",
    ageGroup: "9-12",
    responses: {
      gentle:
        "You’ve got two minutes to wrap and save. Handle the limit without me hovering, then come find me for what’s next.",
      calm:
        "Sixty seconds left. Close it yourself to keep full time tomorrow. If I have to step in, you lose thirty minutes.",
      direct: "Screen time ends now. Power down immediately or tomorrow is zero."
    },
    whyThisWorks: "Trust + real consequences builds autonomy and discipline.",
    dadMove: "Self-Regulate or Lose It"
  },

  // 5) Quitting after a setback
  {
    moment: "Quitting after a setback",
    ageGroup: "3-5",
    responses: {
      gentle: "That was tricky! Let’s try one more time together. You can do hard things.",
      calm: "Try once more—I’ll help this time. If you quit, we put it away for now.",
      direct: "One more try right now, then we’re done for today. Try again."
    },
    whyThisWorks: "Immediate, supported retry wires resilience without shame.",
    dadMove: "One More Together"
  },
  {
    moment: "Quitting after a setback",
    ageGroup: "6-8",
    responses: {
      gentle:
        "That was frustrating, and I saw your effort. Pick one tiny change and give it one more try, then a quick break.",
      calm:
        "Failure is data. Do two focused retries with one adjustment, then review what worked.",
      direct:
        "One more deliberate try with the adjustment we discussed—then done for now."
    },
    whyThisWorks: "Frames failure as iteration; builds grit with doable reps.",
    dadMove: "Adjust + Retry"
  },
  {
    moment: "Quitting after a setback",
    ageGroup: "9-12",
    responses: {
      gentle:
        "Failure grows skill. Five-minute reset, then one strategic change and three clean attempts. Want feedback or space?",
      calm: "Setbacks build competence. Three focused reps with adjustments, then evaluate.",
      direct:
        "No walking away after one fail. Do three more solid attempts or lose the activity for a week."
    },
    whyThisWorks: "Normalizes struggle and ties persistence to privileges.",
    dadMove: "Three-Rep Rule"
  },

  // 6) Lying or hiding the truth
  {
    moment: "Lying",
    ageGroup: "3-5",
    responses: {
      gentle:
        "Telling the truth keeps us close. Try again with the real story and I’ll help you fix it.",
      calm:
        "I need the real story now. Tell the truth and we’ll fix it together. Keep fibbing and it’s a time-out.",
      direct: "That wasn’t true. Tell me what really happened right now or take a time-out."
    },
    whyThisWorks: "Links honesty to quick repair; keeps correction short and clear.",
    dadMove: "Truth Helper"
  },
  {
    moment: "Lying",
    ageGroup: "6-8",
    responses: {
      gentle:
        "Honesty keeps our trust strong. Tell me exactly what happened so we can fix it. Truth shrinks the consequence.",
      calm:
        "You lied, and that breaks trust. Full truth now and a repair task makes it smaller; hiding it makes it bigger.",
      direct:
        "I already know the basics. Tell me the truth now—lying adds a consequence, honesty reduces it."
    },
    whyThisWorks: "Teaches cause/effect for integrity and a path to rebuild trust.",
    dadMove: "Trust Bank"
  },
  {
    moment: "Lying",
    ageGroup: "9-12",
    responses: {
      gentle:
        "I value honesty over perfection. Full truth so we can handle it together. Coming clean earns trust back faster.",
      calm:
        "One chance to tell me everything. Full honesty gets a fair consequence; if I uncover more, it doubles.",
      direct:
        "I have enough info. Tell the truth now and face a reasonable consequence—or I piece it together and it’s severe."
    },
    whyThisWorks: "Sets transparent stakes and rewards integrity.",
    dadMove: "Honesty First Policy"
  },

  // 7) Tantrum / meltdown in public
  {
    moment: "Public meltdown",
    ageGroup: "3-5",
    responses: {
      gentle:
        "You’re really upset. Let’s sit over here together. Breathe in through your nose, out through your mouth. I’m right here.",
      calm:
        "We’re taking a break now. Come sit with me away from the crowd. When you’re calmer, we’ll decide what’s next.",
      direct: "We’re leaving this spot now. Walk with me or I’ll carry you to a quiet place."
    },
    whyThisWorks:
      "Reduce stimulation first; co-regulate before problem-solving.",
    dadMove: "The Reset Spot"
  },
  {
    moment: "Public meltdown",
    ageGroup: "6-8",
    responses: {
      gentle:
        "Looks like it’s too much. Let’s step to a quiet spot and take slow breaths. Then we can finish fast or head home.",
      calm:
        "Time for a reset. Breathe four in, four out. Then decide: finish quick or leave now.",
      direct:
        "We’re done here. Heading to the car to calm down. If you pull it together, we can come back."
    },
    whyThisWorks: "Calm first, choice second—prevents rewarding the meltdown.",
    dadMove: "Calm Code"
  },
  {
    moment: "Public meltdown",
    ageGroup: "9-12",
    responses: {
      gentle:
        "I can see you’re overwhelmed. Step outside for a minute to collect yourself. Ready to finish, break, or go home?",
      calm:
        "We’re pausing this. Take sixty seconds, then tell me your plan. The meltdown stops now.",
      direct:
        "This stops now. We’re leaving. Walk with me calmly, or we leave anyway."
    },
    whyThisWorks: "Protects dignity, gives agency after regulation.",
    dadMove: "Exit + Plan"
  },

  // 8) Not sharing / being selfish
  {
    moment: "Not sharing / being selfish",
    ageGroup: "3-5",
    responses: {
      gentle:
        "We take turns. You can have two more minutes, then it’s their turn. Do you want to set the timer?",
      calm:
        "It’s share time. You’ve had a turn—pass it and you’ll get it back when the timer beeps.",
      direct: "Pass it now. If you refuse, the toy goes away for everyone."
    },
    whyThisWorks:
      "Concrete turns + timers make fairness visible and cut conflict.",
    dadMove: "Two-Minute Turn"
  },
  {
    moment: "Not sharing / being selfish",
    ageGroup: "6-8",
    responses: {
      gentle:
        "Fair play means turns. Offer a swap or set a timer so both get time.",
      calm:
        "You’ve had it long enough. Hand it over, then you get it back after five minutes. Fair or toy goes away.",
      direct:
        "Share now or I remove it. Your choice—cooperate and keep the game going."
    },
    whyThisWorks:
      "Externalizes fairness and keeps stakes small but real.",
    dadMove: "Fair-Play Timer"
  },
  {
    moment: "Not sharing / being selfish",
    ageGroup: "9-12",
    responses: {
      gentle:
        "Think team, not just self. Share it now and set a schedule so it stays fair.",
      calm:
        "You’re holding up the group. Share it and agree on a rotation, or I’ll set one.",
      direct: "No hoarding. Share or lose access for the day."
    },
    whyThisWorks: "Builds perspective-taking and aligns with peer norms.",
    dadMove: "Team Rule"
  },

  // 9) Talking back to Mom or another adult
  {
    moment: "Disrespect to Mom/another adult",
    ageGroup: "3-5",
    responses: {
      gentle: "We talk nicely to adults. Say it again with a nice voice.",
      calm: "That wasn’t okay. Say sorry and use a kind voice.",
      direct: "Time-out for being rude. When you’re back, apologize kindly."
    },
    whyThisWorks: "Immediate correction + simple repair builds early respect.",
    dadMove: "Instant Repair"
  },
  {
    moment: "Disrespect to Mom/another adult",
    ageGroup: "6-8",
    responses: {
      gentle:
        "You can be upset and still kind. Try that sentence again respectfully, then check in with Mom to repair.",
      calm:
        "Disrespect isn’t how we speak. Repair first—apology plus one helpful action—then we talk about what upset you.",
      direct:
        "That crossed a line. Consequence now; repair with Mom before anything else."
    },
    whyThisWorks: "Protects family hierarchy and teaches concrete repair.",
    dadMove: "Two-Step Repair"
  },
  {
    moment: "Disrespect to Mom/another adult",
    ageGroup: "9-12",
    responses: {
      gentle:
        "You’re upset, but disrespecting Mom is a hard line. Cool off ten minutes, then apologize and talk about the trigger.",
      calm:
        "Disrespect to an adult costs you. Lose tonight’s plans and make a full repair.",
      direct:
        "That ended your privileges for the week. Earn them back with a genuine repair and consistent respect."
    },
    whyThisWorks:
      "Strong boundary + sustained change teaches relational accountability.",
    dadMove: "Respect Reset Period"
  },

  // 10) Refusing bedtime / stalling
  {
    moment: "Refusing bedtime / stalling",
    ageGroup: "3-5",
    responses: {
      gentle: "Bedtime steps now: potty, pajamas, one book. Do you want to pick the book or should I?",
      calm: "We’re doing bedtime now. If you stall, we skip the book. Start pajamas.",
      direct: "Lights out in two minutes. Keep stalling and it’s lights out now."
    },
    whyThisWorks:
      "Predictable routine + small choices reduce fights at transition.",
    dadMove: "Bedtime Ladder"
  },
  {
    moment: "Refusing bedtime / stalling",
    ageGroup: "6-8",
    responses: {
      gentle: "Quick routine: teeth, pajamas, two pages. Beat the timer and you pick tomorrow’s breakfast.",
      calm:
        "Timer’s on. In bed by the beep to keep tomorrow’s screen time. Miss it and you lose ten minutes.",
      direct:
        "Bedtime is non-negotiable. In bed now or lose tomorrow’s privilege."
    },
    whyThisWorks:
      "Timers and tangible stakes make bedtime objective, not personal.",
    dadMove: "Beat-the-Beep"
  },
  {
    moment: "Refusing bedtime / stalling",
    ageGroup: "9-12",
    responses: {
      gentle:
        "Own your routine: set your alarm, lights out at the set time. I trust you to handle it.",
      calm:
        "In bed by time or earlier wake-up and earlier bedtime tomorrow. Your choice.",
      direct:
        "Lights out now. If you push it, you lose evening freedoms the rest of the week."
    },
    whyThisWorks:
      "Shifts ownership and ties sleep habits to freedoms they value.",
    dadMove: "Own Your Night"
  },

  // 11) Fear or anxiety (school, new things, sleep)
  {
    moment: "Fear or anxiety",
    ageGroup: "3-5",
    responses: {
      gentle:
        "Your body feels nervous. I’m here. Let’s do three belly breaths together, then take a tiny brave step.",
      calm: "It’s okay to feel scared and do it anyway. One small step, then a hug.",
      direct: "We’re doing one brave step now together. I’ll go first, then you."
    },
    whyThisWorks:
      "Name → calm → tiny action; builds approach instead of avoidance.",
    dadMove: "Tiny Brave Step"
  },
  {
    moment: "Fear or anxiety",
    ageGroup: "6-8",
    responses: {
      gentle:
        "Fear shows up when things matter. Breathe with me, then pick one doable step. I’ll back you up.",
      calm: "Plan it: one practice run, then the real thing. Effort over perfect.",
      direct: "We don’t let fear be the boss. One committed step now, then celebrate."
    },
    whyThisWorks:
      "Combines co-regulation with graded exposure and agency.",
    dadMove: "Plan-Then-Do"
  },
  {
    moment: "Fear or anxiety",
    ageGroup: "9-12",
    responses: {
      gentle:
        "Anxiety is loud, but it isn’t you. Name it, breathe, then take the first meaningful step. I’m here if you want backup.",
      calm:
        "Pick a small exposure you can own. Text me when it’s done; we’ll debrief what worked.",
      direct:
        "We act before anxiety grows. Do step one in the next five minutes or lose the choice on how we handle it."
    },
    whyThisWorks: "Skill-builds around exposure, ownership, and fast action.",
    dadMove: "Act Before It Amplifies"
  },

  // 12) Disappointment / losing a game or event
  {
    moment: "Disappointment / losing",
    ageGroup: "3-5",
    responses: {
      gentle: "It’s okay to feel sad when we lose. Big hug, then we’ll say one thing we did well.",
      calm: "Feel it for a minute, then we try again next time. What went well today?",
      direct: "Tears are okay. Throwing things isn’t. Calm body first, then talk."
    },
    whyThisWorks:
      "Validates emotion and pivots to simple reflection and control.",
    dadMove: "Feel + One Win"
  },
  {
    moment: "Disappointment / losing",
    ageGroup: "6-8",
    responses: {
      gentle:
        "Losing stings because you care. Name the feeling, then pick one improvement for next time.",
      calm:
        "Two lines: one thing you did well, one thing to train. That’s how competitors grow.",
      direct:
        "We don’t sulk; we learn. Say one lesson and one next step—then we move on."
    },
    whyThisWorks:
      "Channels emotion into a growth loop instead of quitting.",
    dadMove: "Win/Learn Debrief"
  },
  {
    moment: "Disappointment / losing",
    ageGroup: "9-12",
    responses: {
      gentle:
        "I respect that you’re hurting. When you’re ready, let’s review what’s controllable and build a plan.",
      calm:
        "Scoreboard’s done; process isn’t. Identify a fixable skill and schedule the next rep.",
      direct:
        "Own the result, own the response. Pick a concrete next step by tonight—then execute."
    },
    whyThisWorks:
      "Transforms outcome focus into process ownership.",
    dadMove: "Control the Controllables"
  }
] as const;

export default sayThisData;
