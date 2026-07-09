import { deletePushSubscription, savePushSubscription } from "@athonesayate/shared/supabase-data";

export type PushSetupResult =
  | { status: "enabled" }
  | { status: "unsupported"; reason: string }
  | { status: "denied" }
  | { status: "error"; message: string };

function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getRegistration() {
  // The Serwist worker is only registered in production builds; in dev there
  // is no active registration and push can't be enabled.
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ?? null;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) {
    return null;
  }
  const registration = await getRegistration();
  if (!registration) {
    return null;
  }
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications(): Promise<PushSetupResult> {
  if (!pushSupported()) {
    return { status: "unsupported", reason: "This browser does not support web push. On iPhone, add the app to your Home Screen first." };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { status: "error", message: "Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY. Generate keys with `npx web-push generate-vapid-keys`." };
  }

  const registration = await getRegistration();
  if (!registration) {
    return { status: "unsupported", reason: "No service worker registered. Reminders work in the installed app / production build." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { status: "denied" };
  }

  try {
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { status: "error", message: "Browser returned an incomplete push subscription." };
    }

    await savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    return { status: "enabled" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to enable notifications." };
  }
}

export async function disablePushNotifications(): Promise<void> {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) {
    return;
  }
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  try {
    await deletePushSubscription(endpoint);
  } catch {
    // endpoint row will be cleaned up by the dispatcher when the push fails
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
