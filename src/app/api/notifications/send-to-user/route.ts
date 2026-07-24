import { NextResponse } from "next/server";
import { sendPushToUsername } from "@/lib/push-sender";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/send-to-user
 * Kirim push notification ke username tertentu.
 * Dipanggil dari client setelah approve/reject approval request.
 */
export async function POST(request: Request) {
  let username: string | undefined;
  let title: string | undefined;

  try {
    const body = await request.json();
    username = body.username;
    title = body.title;
    const message = body.body;
    const url = body.url;
    const tag = body.tag;

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
      icon: "/logo_NUI.png",
    });

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    logger.error('[SendToUser] Error sending notification', err, { username, title });
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim notifikasi" },
      { status: 500 }
    );
  }
}
