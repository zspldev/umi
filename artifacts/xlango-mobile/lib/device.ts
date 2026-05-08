import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const DEVICE_ID_KEY = "@xlango/deviceId";
const DISPLAY_NAME_KEY = "@xlango/displayName";

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}

export async function getDisplayName(): Promise<string> {
  return (await AsyncStorage.getItem(DISPLAY_NAME_KEY)) ?? "Unknown";
}

export async function setDisplayName(name: string): Promise<void> {
  await AsyncStorage.setItem(DISPLAY_NAME_KEY, name);
}

export async function trackingHeaders(sessionId?: string): Promise<Record<string, string>> {
  const deviceId = await getDeviceId();
  const displayName = await getDisplayName();
  const headers: Record<string, string> = {
    "X-Device-Id": deviceId,
    "X-Display-Name": displayName,
    "X-App-Source": "xlango-mobile",
  };
  if (sessionId) headers["X-Session-Id"] = sessionId;
  return headers;
}
