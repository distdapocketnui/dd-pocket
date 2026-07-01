/**
 * Server-side utility untuk mengirim push notification
 * via Web Push Protocol (VAPID).
 *
 * Penggunaan:
 *   import { sendPushToAll, sendPushToUsername } from "@/lib/push-sender";
 *
 *   await sendPushToAll({
 *     title: "Approval Baru",
 *     body: "Operator meminta edit data SG",
 *     url: "/",
 *   });
 */

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@dd-pocket.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

/**
 * Kirim push notification ke semua subscription
 */
export async function sendPushToAll(payload: PushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[PushSender] VAPID keys not configured");
    return { sent: 0, failed: 0 };
  }

  const db = createClient(supabaseUrl, supabaseAnonKey);
  const { data: subscriptions, error } = await (db
    .from("push_subscriptions") as any)
    .select("endpoint, p256dh, auth");

  if (error || !subscriptions?.length) {
    console.warn("[PushSender] No subscriptions found");
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      // Jika subscription expired/invalid, hapus dari DB
      if (err.statusCode === 410 || err.statusCode === 404) {
        await (db
          .from("push_subscriptions") as any)
          .delete()
          .eq("endpoint", sub.endpoint);
      }
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Kirim push notification ke username tertentu
 */
export async function sendPushToUsername(
  username: string,
  payload: PushPayload
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[PushSender] VAPID keys not configured");
    return { sent: 0, failed: 0 };
  }

  const db = createClient(supabaseUrl, supabaseAnonKey);
  const { data: subscriptions, error } = await (db
    .from("push_subscriptions") as any)
    .select("endpoint, p256dh, auth")
    .eq("username", username);

  if (error || !subscriptions?.length) {
    console.warn(`[PushSender] No subscriptions found for username: ${username}`);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await (db
          .from("push_subscriptions") as any)
          .delete()
          .eq("endpoint", sub.endpoint);
      }
      failed++;
    }
  }

  return { sent, failed };
}
