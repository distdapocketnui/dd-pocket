import { NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push-sender";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/send
 * Broadcast push notification ke semua subscriber.
 * Dipanggil setelah approval request dibuat.
 */
export async function POST(request: Request) {
  let title: string | undefined;

  try {
    const body = await request.json();
    title = body.title;
    const message = body.body;
    const url = body.url;
    const tag = body.tag;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Field title dan body wajib diisi" },
        { status: 400 }
      );
    }

    const result = await sendPushToAll({
      title,
      body: message,
      url: url || "/",
      tag: tag || "dd-pocket-general",
      icon: "/icons/icon-192x192.png",
    });

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    logger.error('[SendNotification] Error sending broadcast', err, { title });
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim notifikasi" },
      { status: 500 }
    );
  }
}
