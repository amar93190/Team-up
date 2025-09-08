import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/config/supabase";

type ExpoPushMessage = {
  to: string | string[];
  sound?: "default" | null;
  title?: string;
  body?: string;
  data?: Record<string, any>;
};

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  const projectId = Notifications.getExpoPushTokenAsync.length
    ? (await Notifications.getExpoPushTokenAsync()).data
    : (await Notifications.getExpoPushTokenAsync({ projectId: undefined as any })).data;

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return projectId;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase.from("push_tokens").upsert({ user_id: userId, token });
}

export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, any>) {
  const msg: ExpoPushMessage = { to: token, title, body, sound: "default", data };
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
}

export async function sendPushMany(tokens: string[], title: string, body: string, data?: Record<string, any>) {
  if (tokens.length === 0) return;
  // Expo allows array payloads too
  const payload = tokens.map((t) => ({ to: t, title, body, sound: "default", data }));
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}


