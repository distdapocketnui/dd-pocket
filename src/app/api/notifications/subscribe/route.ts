import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/notifications/subscribe
 * Menyimpan subscription push notification ke Supabase
 */
export async function POST(request: Request) {
  let endpoint: string | undefined;
  let username: string | undefined;

  try {
    const body = await request.json();
    endpoint = body.endpoint;
    const keys = body.keys;
    username = body.username;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Data subscription tidak lengkap" },
        { status: 400 }
      );
    }

    const db = createClient(supabaseUrl, supabaseAnonKey);

    // Cek apakah endpoint sudah terdaftar
    const { data: existing } = await (db
      .from("push_subscriptions") as any)
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (existing) {
      // Update yang sudah ada
      const { error } = await (db
        .from("push_subscriptions") as any)
        .update({
          p256dh: keys.p256dh,
          auth: keys.auth,
          username: username || null,
          user_agent: request.headers.get("user-agent") || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // Insert baru
      const { error } = await (db
        .from("push_subscriptions") as any)
        .insert({
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          username: username || null,
          user_agent: request.headers.get("user-agent") || null,
        });

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    logger.error('[Subscribe] Error saving subscription', err, { endpoint, username });
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan subscription" },
      { status: 500 }
    );
  }
}
