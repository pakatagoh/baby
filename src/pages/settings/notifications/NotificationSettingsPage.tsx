import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getStoredDeviceProfile,
  saveDeviceProfile,
  type DeviceProfile,
} from "@/lib/device-profile";
import { base64UrlToUint8Array } from "@/lib/push-browser";
import {
  disablePushSubscription,
  getVapidPublicKey,
  registerDeviceProfile,
  registerPushSubscription,
} from "@/lib/push-fn";
import type { DeviceUser } from "@/lib/notification-schema";

const USERS: { value: DeviceUser; label: string }[] = [
  { value: "pakata", label: "Pakata" },
  { value: "isabel", label: "Isabel" },
];

type PushStatus = "checking" | "unsupported" | "disabled" | "enabled" | "blocked" | "error";

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const registerProfile = useServerFn(registerDeviceProfile);
  const fetchVapidKey = useServerFn(getVapidPublicKey);
  const registerSubscription = useServerFn(registerPushSubscription);
  const disableSubscription = useServerFn(disablePushSubscription);
  const [selectedUser, setSelectedUser] = useState<DeviceUser>("pakata");
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("checking");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingAlerts, setChangingAlerts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredDeviceProfile();
    if (stored) {
      setProfile(stored);
      setSelectedUser(stored.user);
    }

    if (
      typeof Notification === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPushStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setPushStatus("blocked");
      return;
    }

    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((current) => {
        setSubscription(current);
        setPushStatus(current ? "enabled" : "disabled");
      })
      .catch(() => setPushStatus("error"));
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    setError(null);
    try {
      const nextProfile = saveDeviceProfile(selectedUser);
      await registerProfile({
        data: { deviceId: nextProfile.deviceId, user: nextProfile.user },
      });
      setProfile(nextProfile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save device settings");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleEnableAlerts() {
    if (!profile) {
      setError("Save this device's owner before enabling alerts");
      return;
    }

    setChangingAlerts(true);
    setError(null);
    try {
      const { vapidPublicKey } = await fetchVapidKey();
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("blocked");
        return;
      }

      const current =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        }));
      const json = current.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("The browser returned an incomplete push subscription");
      }

      await registerSubscription({
        data: {
          deviceId: profile.deviceId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      });
      setSubscription(current);
      setPushStatus("enabled");
    } catch (cause) {
      setPushStatus("error");
      setError(cause instanceof Error ? cause.message : "Unable to enable alerts");
    } finally {
      setChangingAlerts(false);
    }
  }

  async function handleDisableAlerts() {
    if (!profile) return;
    setChangingAlerts(true);
    setError(null);
    try {
      await disableSubscription({ data: { deviceId: profile.deviceId } });
      await subscription?.unsubscribe();
      setSubscription(null);
      setPushStatus("disabled");
    } catch (cause) {
      setPushStatus("error");
      setError(cause instanceof Error ? cause.message : "Unable to disable alerts");
    } finally {
      setChangingAlerts(false);
    }
  }

  const statusLabel: Record<PushStatus, string> = {
    checking: "Checking support…",
    unsupported: "Unsupported on this browser",
    disabled: "Disabled",
    enabled: "Enabled",
    blocked: "Blocked — allow notifications in browser settings",
    error: "Unable to determine alert state",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Back to settings"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Bell className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Notification Settings</h2>
      </div>

      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <div>
          <h3 className="font-medium">This device belongs to:</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose who uses this browser so new-entry alerts can be routed to the other person.
          </p>
        </div>

        <div className="space-y-2">
          {USERS.map((user) => {
            const active = selectedUser === user.value;
            return (
              <label
                key={user.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${
                  active ? "border-primary bg-primary/10" : "border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="deviceUser"
                  value={user.value}
                  checked={active}
                  onChange={() => setSelectedUser(user.value)}
                  className="sr-only"
                />
                <span
                  className={`flex size-5 items-center justify-center rounded-full border-2 ${
                    active ? "border-primary" : "border-gray-400"
                  }`}
                >
                  {active && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
                <span className="text-sm font-medium">{user.label}</span>
              </label>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          This is a household convenience profile, not secure authentication.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="button" className="w-full" disabled={savingProfile} onClick={handleSaveProfile}>
          {savingProfile ? "Saving…" : "Save device owner"}
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <div>
          <h3 className="font-medium">New-entry alerts</h3>
          <p className="mt-1 text-sm text-muted-foreground" role="status">
            Status: {statusLabel[pushStatus]}
          </p>
        </div>
        {pushStatus === "enabled" ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={changingAlerts}
            onClick={handleDisableAlerts}
          >
            {changingAlerts ? "Disabling…" : "Disable alerts"}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={changingAlerts || pushStatus === "unsupported" || pushStatus === "blocked"}
            onClick={handleEnableAlerts}
          >
            {changingAlerts ? "Enabling…" : "Enable new-entry alerts"}
          </Button>
        )}
      </section>
    </div>
  );
}
