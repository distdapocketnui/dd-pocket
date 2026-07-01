import { NextResponse } from "next/server";
import { sendPushToUsername } from "@/lib/push-sender";

/**
 * POST /api/notifications/send-to-user
 * Kirim push notification ke username tertentu.
 * Dipanggil dari client setelah approve/reject approval request.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, title, body: message, url, tag } = body;

    if (!username || !title || !message) {
      return NextResponse.json(
        { error: "Field username, title, dan body wajib diisi" },
        { status: 400 }
      );
    }

    const result = await sendPushToUsername(username, {
      title,
      body: message,
      url: url || "/",
      tag: tag || "dd-pocket-approval",
      icon: "/icons/icon-192x192.png",
    });

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("[SendToUser] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim notifikasi" },
      { status: 500 }
    );
  }
}
