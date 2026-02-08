import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Avoid showing alerts when the app is in the foreground.
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const FUNNY_SNARKY_TIME_BASED = [
  "Bro. 60 seconds. That’s less time than your morning scroll.",
  "Still waiting for the ‘perfect moment’? It’s now.",
  "Ignoring your legacy like it’s a group text again?",
  "One minute for them. You gave Netflix three hours.",
  "Guilt’s not a bug. It’s a feature. Open Hey Dad.",
  "No perfect words needed — just hit record, man.",
  "You’ve posted more memes than memories. Fix that.",
];

const KIDS_PERSPECTIVE = [
  "Hey Dad, what made you laugh the hardest this week?",
  "Dad, what’s something you learned the hard way?",
  "Tell me about a time you felt proud of yourself.",
  "Hey Dad, what’s one thing you hope I never forget?",
  "What was your favorite thing to do with your dad?",
  "Dad, what would you tell me if I ever felt lost?",
  "What’s something you wish you did differently growing up?",
  "Hey Dad, what was your favorite meal as a kid?",
  "Tell me about a mistake that made you stronger.",
  "What do you love most about being my dad?",
  "Hey Dad, what did you dream about when you were little?",
  "What’s one piece of advice you hope I actually listen to?",
  "Dad, tell me about the day I was born.",
  "What’s a lesson you wish someone taught you earlier?",
  "Hey Dad, what’s one thing you want me to remember about life?",
  "What kind of person do you hope I grow up to be?",
  "Dad, what still makes you feel like a kid?",
  "Hey Dad, what makes our family different?",
  "What was the hardest thing you ever had to do?",
  "Tell me a story about you and Mom before I was born.",
  "Hey Dad, what makes you proud of me lately?",
  "If you could tell me one thing this year, what is it today?",
  "Dad, what makes you smile when you think of me?",
  "Hey Dad, just talk to me today — about anything.",
];

// Keys for AsyncStorage so we remember what we sent last and if we've scheduled
const LAST_CATEGORY_KEY = "heydad:lastCategory"; // "funny" | "kid"
const WEEKLY_NOTIFICATION_ID_KEY = "heydad:weeklyNotificationId";

// Helper to pick which bucket to use this week and return a random message
async function pickWeeklyMessage(): Promise<{ title: string; body: string; category: "funny" | "kid" }> {
  // read last category
  const last = await AsyncStorage.getItem(LAST_CATEGORY_KEY);

  // alternate: if last was funny -> do kid. else do funny.
  const nextCategory = last === "funny" ? "kid" : "funny";

  let pool: string[];
  let title: string;

  if (nextCategory === "funny") {
    pool = FUNNY_SNARKY_TIME_BASED;
    title = "Hey Dad 👀";
  } else {
    pool = KIDS_PERSPECTIVE;
    title = "Your kid wants to know 💬";
  }

  // pick random message from that pool
  const body = pool[Math.floor(Math.random() * pool.length)];

  return { title, body, category: nextCategory };
}

export async function initNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission not granted");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("heydad-default", {
      name: "HeyDad Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ffffff",
    });
  }

  return true;
}

async function getScheduledWeeklyNotificationId(): Promise<string | null> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const storedId = await AsyncStorage.getItem(WEEKLY_NOTIFICATION_ID_KEY);

  if (storedId) {
    const stillScheduled = scheduled.some((n) => n.identifier === storedId);
    if (stillScheduled) return storedId;

    await AsyncStorage.removeItem(WEEKLY_NOTIFICATION_ID_KEY);
  }

  const existingWeekly = scheduled.find(
    (n) =>
      n.content?.title === "Hey Dad 👀" ||
      n.content?.title === "Your kid wants to know 💬"
  );

  if (existingWeekly?.identifier) {
    await AsyncStorage.setItem(WEEKLY_NOTIFICATION_ID_KEY, existingWeekly.identifier);
    return existingWeekly.identifier;
  }

  return null;
}

export async function scheduleWeeklyPrompt() {
  const existingId = await getScheduledWeeklyNotificationId();
  if (existingId) {
    console.log("Weekly reminder already scheduled with id:", existingId);
    return existingId;
  }

  const { title, body, category } = await pickWeeklyMessage();

  await AsyncStorage.setItem(LAST_CATEGORY_KEY, category);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      weekday: 1,      // 1 = Sunday on iOS. Android ignores weekday in some cases.
      hour: 20,
      minute: 0,
      repeats: true,
      channelId: Platform.OS === "android" ? "heydad-default" : undefined,
    } as any,
  });

  await AsyncStorage.setItem(WEEKLY_NOTIFICATION_ID_KEY, identifier);

  console.log("Scheduled weekly reminder with id:", identifier);
  return identifier;
}

export async function registerPushTokenForUser(id: string) {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenData?.data;

    if (!expoPushToken) return;

    await supabase
      .from("profiles")
      .upsert({
        id,
        expo_push_token: expoPushToken,
      }, { onConflict: "id" });
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}


export async function markUserActive(id: string) {
  await supabase
    .from("profiles")
    .update({
      last_activity_at: new Date().toISOString()
    })
    .eq("id", id);
}
