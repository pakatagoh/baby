import { describe, expect, it } from "vitest";
import {
  getStoredDeviceProfile,
  saveDeviceProfile,
  type DeviceProfileStorage,
} from "./device-profile";

function storage(): DeviceProfileStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("device profile", () => {
  it("creates and persists an opaque device ID with the selected user", () => {
    const localStorage = storage();

    const profile = saveDeviceProfile("pakata", localStorage, () => "device-uuid");

    expect(profile).toEqual({ deviceId: "device-uuid", user: "pakata" });
    expect(getStoredDeviceProfile(localStorage)).toEqual(profile);
  });

  it("keeps the existing device ID when the user changes", () => {
    const localStorage = storage();
    saveDeviceProfile("pakata", localStorage, () => "device-uuid");

    const profile = saveDeviceProfile("isabel", localStorage, () => "new-device-uuid");

    expect(profile).toEqual({ deviceId: "device-uuid", user: "isabel" });
  });

  it("rejects an unsupported user", () => {
    const localStorage = storage();

    expect(() => saveDeviceProfile("someone-else", localStorage, () => "device-uuid")).toThrow(
      "Device user must be pakata or isabel",
    );
  });

  it("returns null when no device profile has been saved", () => {
    expect(getStoredDeviceProfile(storage())).toBeNull();
  });
});
