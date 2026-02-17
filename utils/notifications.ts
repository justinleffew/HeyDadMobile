import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
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

const LAST_CATEGORY_KEY = "heydad:lastCategory";
const WEEKLY_NOTIFICATION_ID_KEY = "heydad:weeklyNotificationId";
const WEEKLY_NOTIFICATION_SCHEDULED_FOR_KEY = "heydad:weeklyNotificationScheduledFor";

async function pickWeeklyMessage(): Promise<{ title: string; body: string; category: "funny" | "kid" }> {
  const last = await AsyncStorage.getItem(LAST_CATEGORY_KEY);
  const nextCategory = last === "funny" ? "kid" : "funny";

  if (nextCategory === "funny") {
    const body = FUNNY_SNARKY_TIME_BASED[Math.floor(Math.random() * FUNNY_SNARKY_TIME_BASED.length)];
    return { title: "Hey Dad 👀", body, category: "funny" };
  }

  const body = KIDS_PERSPECTIVE[Math.floor(Math.random() * KIDS_PERSPECTIVE.length)];
  return { title: "Your kid wants to know 💬", body, category: "kid" };
}

const getNextSundayAt8Pm = () => {
  const now = new Date();
  const next = new Date(now.getTime());
  const daysUntilSunday = (7 - now.getDay()) % 7;

  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(20, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 7);
  }

  return next;
};

async function getValidScheduledWeeklyNotificationId(): Promise<string | null> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const storedId = await AsyncStorage.getItem(WEEKLY_NOTIFICATION_ID_KEY);
  const scheduledFor = await AsyncStorage.getItem(WEEKLY_NOTIFICATION_SCHEDULED_FOR_KEY);

  if (!storedId || !scheduledFor) {
    return null;
  }

  const scheduledDate = new Date(scheduledFor);
  const stillScheduled = scheduled.some((n) => n.identifier === storedId);

  if (stillScheduled && scheduledDate > new Date()) {
    return storedId;
  }

  await AsyncStorage.multiRemove([WEEKLY_NOTIFICATION_ID_KEY, WEEKLY_NOTIFICATION_SCHEDULED_FOR_KEY]);
  return null;
}

export async function initNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
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

export async function scheduleWeeklyPrompt() {
  const existingId = await getValidScheduledWeeklyNotificationId();
  if (existingId) {
    return existingId;
  }

  const staleId = await AsyncStorage.getItem(WEEKLY_NOTIFICATION_ID_KEY);
  if (staleId) {
    await Notifications.cancelScheduledNotificationAsync(staleId).catch(() => null);
  }

  const { title, body, category } = await pickWeeklyMessage();
  const triggerDate = getNextSundayAt8Pm();

  await AsyncStorage.setItem(LAST_CATEGORY_KEY, category);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      date: triggerDate,
      channelId: Platform.OS === "android" ? "heydad-default" : undefined,
    },
  });

  await AsyncStorage.multiSet([
    [WEEKLY_NOTIFICATION_ID_KEY, identifier],
    [WEEKLY_NOTIFICATION_SCHEDULED_FOR_KEY, triggerDate.toISOString()],
  ]);

  return identifier;
}

export async function registerPushTokenForUser(id: string) {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenData?.data;

    if (!expoPushToken) return;

    await supabase
      .from("profiles")
      .upsert(
        {
          id,
          expo_push_token: expoPushToken,
        },
        { onConflict: "id" }
      );
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

export async function markUserActive(id: string) {
  await supabase
    .from("profiles")
    .update({
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", id);
}
