import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/google-setup
 * Cek apakah konfigurasi Google Drive sudah siap.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  return NextResponse.json({
    configured: !!(clientId && clientSecret),
    clientId: clientId || null,
  });
}

/**
 * POST /api/google-setup
 * Menerima authorization code dari OAuth flow, exchange ke refresh token,
 * lalu simpan ke database Supabase.
 *
 * Input: { code: string, redirectUri?: string }
 * Output: { ok: true }
 */
export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();
    if (!code) {
      return NextResponse.json(
        { error: "Authorization code diperlukan" },
        { status: 400 },
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum diatur" },
        { status: 500 },
      );
    }

    // Exchange authorization code → refresh_token + access_token
    // redirect_uri harus SAMA dengan yang dipakai waktu minta code
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || "postmessage",
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[GoogleSetup] Token exchange error:", err);
      return NextResponse.json(
        { error: "Gagal exchange authorization code" },
        { status: 500 },
      );
    }

    const tokens = await tokenRes.json();
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Tidak mendapat refresh token. Pastikan access_type=offline" },
        { status: 500 },
      );
    }

    // Simpan refresh token ke Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: upsertError } = await supabase.from("app_config").upsert(
      { key: "google_drive_refresh_token", value: refreshToken },
      { onConflict: "key" },
    );

    if (upsertError) {
      console.error("[GoogleSetup] Supabase error:", upsertError);
      return NextResponse.json(
        { error: "Gagal menyimpan refresh token ke database" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[GoogleSetup] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal setup Google Drive" },
      { status: 500 },
    );
  }
}
