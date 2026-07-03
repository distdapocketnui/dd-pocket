"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type Status =
  | { type: "idle" }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function GoogleSetupPage() {
  const [status, setStatus] = useState<Status>({ type: "idle" });

  useEffect(() => {
    // Cek apakah ada authorization code dari redirect Google
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus({
        type: "error",
        message: "Login dibatalkan atau gagal",
      });
      // Bersihkan URL
      window.history.replaceState({}, "", "/admin/google-setup");
      return;
    }

    if (code) {
      // Ada code dari redirect — kirim ke server
      exchangeCode(code);
      // Bersihkan URL
      window.history.replaceState({}, "", "/admin/google-setup");
    }
  }, []);

  async function exchangeCode(code: string) {
    setStatus({
      type: "loading",
      message: "Menyimpan token ke server...",
    });

    try {
      const res = await fetch("/api/google-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        code,
        redirectUri: window.location.origin + "/admin/google-setup",
      }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data.error || "Gagal menyimpan token",
        });
        return;
      }

      setStatus({
        type: "success",
        message:
          "✅ Berhasil! Google Drive siap digunakan. Semua upload akan terpusat ke akun ini.",
      });
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err?.message || "Gagal menghubungi server",
      });
    }
  }

  async function handleConnect() {
    setStatus({
      type: "loading",
      message: "Mengarahkan ke halaman login Google...",
    });

    // Ambil client_id dari server (tidak di-hardcode di client bundle)
    let clientId = "";
    try {
      const res = await fetch("/api/google-setup");
      const data = await res.json();
      clientId = data.clientId;
    } catch {}

    if (!clientId) {
      setStatus({
        type: "error",
        message:
          "GOOGLE_CLIENT_ID belum diatur. Tambahkan dulu di .env.local",
      });
      return;
    }

    const redirectUri = window.location.origin + "/admin/google-setup";

    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/drive.file",
        access_type: "offline",
        prompt: "consent",
      });

    window.location.href = authUrl;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Setup Google Drive
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Klik tombol di bawah untuk menghubungkan akun Google Drive Anda.
            Semua upload gambar akan terpusat ke akun ini.
          </p>
        </div>

        {/* Status messages */}
        {status.type === "success" && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800">{status.message}</p>
          </div>
        )}

        {status.type === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-800">{status.message}</p>
          </div>
        )}

        {status.type === "loading" && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0 animate-spin" />
            <p className="text-sm text-blue-800">{status.message}</p>
          </div>
        )}

        {/* Button */}
        <button
          type="button"
          onClick={handleConnect}
          disabled={status.type === "loading" || status.type === "success"}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {status.type === "loading" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Memproses...
            </>
          ) : status.type === "success" ? (
            "✓ Sudah terhubung"
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect Google Drive
            </>
          )}
        </button>

        {/* Info */}
        <div className="mt-6 text-xs text-gray-400 space-y-1">
          <p>
            ⚠️ Pastikan akun Google yang dipilih adalah akun utama untuk
            penyimpanan gambar.
          </p>
          <p>
            🔒 Refresh token disimpan di database dan hanya digunakan server
            untuk upload file.
          </p>
        </div>
      </div>
    </div>
  );
}
