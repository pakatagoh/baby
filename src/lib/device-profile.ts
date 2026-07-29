import { deviceUsers, type DeviceUser } from "./notification-schema";

export const DEVICE_PROFILE_ID_KEY = "baby.deviceProfileId";
export const DEVICE_USER_KEY = "baby.user";

export interface DeviceProfile {
  deviceId: string;
  user: DeviceUser;
}

export interface DeviceProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type DeviceIdFactory = () => string;

function isDeviceUser(value: string | null): value is DeviceUser {
  return value !== null && (deviceUsers as readonly string[]).includes(value);
}

function browserStorage(): DeviceProfileStorage {
  if (typeof localStorage === "undefined") {
    throw new Error("Device profile storage is only available in a browser");
  }
  return localStorage;
}

function newDeviceId(): string {
  return globalThis.crypto.randomUUID();
}

export function getStoredDeviceProfile(storage = browserStorage()): DeviceProfile | null {
  const deviceId = storage.getItem(DEVICE_PROFILE_ID_KEY);
  const user = storage.getItem(DEVICE_USER_KEY);
  if (!deviceId || !isDeviceUser(user)) return null;
  return { deviceId, user };
}

export function saveDeviceProfile(
  user: string,
  storage = browserStorage(),
  createDeviceId: DeviceIdFactory = newDeviceId,
): DeviceProfile {
  if (!isDeviceUser(user)) {
    throw new Error("Device user must be pakata or isabel");
  }

  const existing = getStoredDeviceProfile(storage);
  const profile = { deviceId: existing?.deviceId ?? createDeviceId(), user };
  storage.setItem(DEVICE_PROFILE_ID_KEY, profile.deviceId);
  storage.setItem(DEVICE_USER_KEY, profile.user);
  return profile;
}
