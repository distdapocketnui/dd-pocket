import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/notifications/unsubscribe
 * Menghapus subscription push notification dari Supabase
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint tidak ditemukan" },
        { status: 400 }
      );
    }

    const db = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await (db
      .from("push_subscriptions") as any)
      .delete()
      .eq("endpoint", endpoint);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Unsubscribe] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus subscription" },
      { status: 500 }
    );
  }
}
