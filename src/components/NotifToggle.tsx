"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  requestNotificationPermission,
  subscribeToPush,
  unsubscribePush,
  saveSubscriptionOnServer,
  deleteSubscriptionOnServer,
  getPushStatus,
} from "@/lib/notification";

/**
 * Tombol toggle push notification untuk dropdown profil/halaman profil.
 * Muncul hanya jika browser mendukung Push API.
 */
export default function NotifToggle() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission | "unavailable";
    subscribed: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  if (!status || !status.supported) return null;

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (status.subscribed) {
        // ── Unsubscribe ──
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await unsubscribePush();
          await deleteSubscriptionOnServer(endpoint);
        }
        setStatus((prev) => prev ? { ...prev, subscribed: false } : prev);
      } else {
        // ── Subscribe ──
        const granted = await requestNotificationPermission();

        if (!granted) {
          setStatus((prev) => prev ? { ...prev, permission: "denied" } : prev);
          return;
        }

        const sub = await subscribeToPush();

        if (sub) {
          // Simpan dengan username agar cocok dengan user di approval
          await saveSubscriptionOnServer(sub, user?.name || undefined);
          setStatus((prev) => prev ? { ...prev, permission: "granted", subscribed: true } : prev);
        }
      }
    } catch (err) {
      console.warn("[NotifToggle] Error:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={busy || status.permission === "denied"}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 hover:bg-blue-50 hover:text-blue-600"
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      ) : status.subscribed ? (
        <Bell className="w-4 h-4 text-green-600" />
      ) : (
        <BellOff className="w-4 h-4 text-gray-400" />
      )}
      <span className="flex-1 text-left">
        {busy
          ? "Memproses..."
          : status.subscribed
            ? "Notifikasi aktif"
            : status.permission === "denied"
              ? "Notifikasi diblokir"
              : "Aktifkan notifikasi"}
      </span>
      {status.subscribed && !busy && (
        <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">ON</span>
      )}
    </button>
  );
}
