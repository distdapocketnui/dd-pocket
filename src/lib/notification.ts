/**
 * Utility untuk Push Notification — client-side
 *
 * VAPID public key dibaca dari NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * yang sudah di-set di .env.local dan di-deploy ke Vercel.
 */

// VAPID public key
function getVapidPublicKey(): string {
  if (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }
  throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY tidak ditemukan");
}

/** Minta permission notifikasi ke browser */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/** Subscribe ke push notification */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;

  const reg = await navigator.serviceWorker.ready;
  const publicKey = getVapidPublicKey();

  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  return subscription;
}

/** Unsubscribe dari push notification */
export async function unsubscribePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** Cek status subscription saat ini */
export async function getPushStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | "unavailable";
  subscribed: boolean;
}> {
  const supported =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  if (!supported) {
    return { supported: false, permission: "unavailable", subscribed: false };
  }

  const permission = Notification.permission;
  let subscribed = false;

  if (permission === "granted") {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
    } catch {
      // SW mungkin belum ready
    }
  }

  return { supported, permission, subscribed };
}

/** Hapus endpoint dari server (dipanggil setelah unsubscribe) */
export async function deleteSubscriptionOnServer(endpoint: string) {
  try {
    await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // silent
  }
}

/** Simpan subscription ke server (dipanggil setelah subscribe) */
export async function saveSubscriptionOnServer(sub: PushSubscription, username?: string) {
  try {
    const payload: any = sub.toJSON();
    if (username) payload.username = username;
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[Notif] Gagal simpan subscription:", err.error || res.statusText);
    }
  } catch {
    // silent — subscription di browser sudah aktif meski gagal simpan
  }
}

// ──────────────────────────────────────────────
// Helper: konversi base64 key ke Uint8Array
// ──────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
