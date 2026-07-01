/**
 * Client-side helper untuk mengirim push notification
 * via API route. Dipanggil setelah approval request dibuat/diproses.
 */

interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Kirim push notification broadcast ke semua subscriber (Admin/Supervisor)
 * Dipanggil setelah approval request dibuat
 */
export async function notifyAdminAfterApprovalRequest(payload: NotifyPayload) {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/",
        tag: "dd-pocket-approval",
      }),
    });
  } catch (err) {
    // Silent fail — notifikasi tidak kritikal
    console.warn("[NotifyAdmin] Gagal kirim push:", err);
  }
}

/**
 * Kirim push notification ke username tertentu
 * Dipanggil setelah approval disetujui/ditolak
 */
export async function notifyUserAfterReview(username: string, payload: NotifyPayload) {
  try {
    await fetch("/api/notifications/send-to-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        title: payload.title,
        body: payload.body,
        url: payload.url || "/",
        tag: "dd-pocket-approval",
      }),
    });
  } catch (err) {
    // Silent fail — notifikasi tidak kritikal
    console.warn("[NotifyUser] Gagal kirim push:", err);
  }
}
