import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  cache: "splitnest_cache_v1",
  queue: "splitnest_queue_v1",
  pinHash: "splitnest_pin_hash_v1",
  theme: "splitnest_theme_v1",
  lastSyncAt: "splitnest_last_sync_at_v1",
  session: "splitnest_session_v1"
} as const;

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function readCache<T>(fallback: T): Promise<T> {
  return readJson<T>(KEYS.cache, fallback);
}

export async function writeCache(value: unknown): Promise<void> {
  await writeJson(KEYS.cache, value);
}

export async function readQueue<T>(fallback: T): Promise<T> {
  return readJson<T>(KEYS.queue, fallback);
}

export async function writeQueue(value: unknown): Promise<void> {
  await writeJson(KEYS.queue, value);
}

export async function getThemeMode(): Promise<"light" | "dark" | "system"> {
  return readJson(KEYS.theme, "system");
}

export async function setThemeMode(mode: "light" | "dark" | "system"): Promise<void> {
  await AsyncStorage.setItem(KEYS.theme, mode);
}

export async function getPinHash(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.pinHash);
}

export async function setPinHash(hash: string | null): Promise<void> {
  if (!hash) {
    await AsyncStorage.removeItem(KEYS.pinHash);
    return;
  }
  await AsyncStorage.setItem(KEYS.pinHash, hash);
}

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastSyncAt);
}

export async function setLastSyncAt(value: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastSyncAt, value);
}

export async function getSessionCache<T>(fallback: T): Promise<T> {
  return readJson(KEYS.session, fallback);
}

export async function setSessionCache(value: unknown): Promise<void> {
  await writeJson(KEYS.session, value);
}

export async function clearStorage(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
