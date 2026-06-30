"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Database, CheckCircle, XCircle, Loader, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TableStatus {
  name: string;
  status: "checking" | "connected" | "error";
  count: number | null;
  error?: string;
}

export default function DatabaseStatusPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && (user.role === "Operator" || user.role === "Supervisor" || user.role === "Manager")) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user?.role === "Operator" || user?.role === "Supervisor" || user?.role === "Manager") return null;

  const [tables, setTables] = useState<TableStatus[]>([
    { name: "users", status: "checking", count: null },
    { name: "switch_gears", status: "checking", count: null },
    { name: "activity_logs", status: "checking", count: null },
  ]);
  const [envCheck, setEnvCheck] = useState<{ url: boolean; key: boolean }>({ url: false, key: false });
  const [supabaseUrl, setSupabaseUrl] = useState("");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    setSupabaseUrl(url);
    setEnvCheck({ url: url.length > 0 && url.startsWith("http"), key: key.length > 20 });

    if (!url || !key) return;

    const checkTables = async () => {
      const supabase = getSupabaseClient();

      for (let i = 0; i < tables.length; i++) {
        try {
          const { data, error } = await supabase
            .from(tables[i].name as "users" | "switch_gears" | "activity_logs")
            .select("*", { count: "exact", head: true });

          if (error) {
            setTables(prev => prev.map((t, idx) =>
              idx === i ? { ...t, status: "error", error: error.message } : t
            ));
          } else {
            setTables(prev => prev.map((t, idx) =>
              idx === i ? { ...t, status: "connected", count: data?.length ?? 0 } : t
            ));
          }
        } catch (err: any) {
          setTables(prev => prev.map((t, idx) =>
            idx === i ? { ...t, status: "error", error: err.message } : t
          ));
        }
      }
    };

    checkTables();
  }, []);

  const statusIcon = (status: TableStatus["status"]) => {
    switch (status) {
      case "checking": return <Loader size={18} className="animate-spin text-gray-400" />;
      case "connected": return <CheckCircle size={18} className="text-emerald-500" />;
      case "error": return <XCircle size={18} className="text-red-500" />;
    }
  };

  const allConnected = tables.every(t => t.status === "connected");
  const anyError = tables.some(t => t.status === "error");
  const isChecking = tables.some(t => t.status === "checking");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mb-2">
          <ArrowLeft size={14} /> Kembali ke Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
          <Database size={24} className="text-blue-600" />
          Status Database Supabase
        </h1>
        <p className="text-sm text-gray-500 mt-1">Memeriksa koneksi database Supabase.</p>
      </div>

      {/* Environment Check */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold">Environment Variables</h3>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
            <div className="flex items-center gap-2">
              {envCheck.url ? (
                <span className="text-xs text-gray-500 truncate max-w-[300px]">{supabaseUrl}</span>
              ) : (
                <span className="text-xs text-red-500">Belum diisi</span>
              )}
              {envCheck.url ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            <div className="flex items-center gap-2">
              {envCheck.key ? (
                <span className="text-xs text-gray-500">{envCheck.key ? "✓ Terisi" : ""}</span>
              ) : (
                <span className="text-xs text-red-500">Belum diisi</span>
              )}
              {envCheck.key ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      {!envCheck.url || !envCheck.key ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <Database size={40} className="mx-auto text-amber-400 mb-3" />
          <h3 className="text-base font-semibold text-amber-800 mb-1">Kredensial Supabase Belum Diisi</h3>
          <p className="text-sm text-amber-700 mb-4">
            Untuk menghubungkan database, Anda perlu mengisi kredensial Supabase di file <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">.env.local</code>
          </p>
          <div className="text-left max-w-lg mx-auto bg-white rounded-lg p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800 mb-2">📋 Langkah-langkah:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Buka <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a> dan login</li>
              <li>Klik &quot;New project&quot; dan buat project baru</li>
              <li>Buka <strong>Project Settings → API</strong></li>
              <li>Copy <strong>Project URL</strong> dan <strong>anon public key</strong></li>
              <li>Buat file <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env.local</code> dan isi seperti di <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env.example</code></li>
              <li>Jalankan SQL dari <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">src/lib/supabase/migration.sql</code> di SQL Editor Supabase</li>
              <li>Jalankan SQL dari <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">src/lib/supabase/seed.sql</code> di SQL Editor Supabase</li>
              <li>Refresh halaman ini</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          {/* Table Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold">Status Koneksi Tabel</h3>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {tables.map((table) => (
                <div key={table.name} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(table.status)}
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{table.name}</span>
                      {table.count !== null && (
                        <span className="text-xs text-gray-500 ml-2">({table.count} baris)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs">
                    {table.status === "connected" && (
                      <span className="text-emerald-600 font-medium">Terhubung</span>
                    )}
                    {table.status === "error" && (
                      <span className="text-red-600" title={table.error}>Error: {table.error?.substring(0, 50)}...</span>
                    )}
                    {table.status === "checking" && (
                      <span className="text-gray-400">Memeriksa...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Verdict */}
          {allConnected && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="text-base font-semibold text-emerald-800">✅ Database Terhubung!</h3>
              <p className="text-sm text-emerald-600 mt-1">Semua tabel berhasil terhubung ke Supabase.</p>
            </div>
          )}
          {anyError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <XCircle size={40} className="mx-auto text-red-500 mb-3" />
              <h3 className="text-base font-semibold text-red-800">⚠️ Beberapa Tabel Bermasalah</h3>
              <p className="text-sm text-red-600 mt-1">
                Pastikan migration.sql sudah dijalankan di Supabase SQL Editor.
              </p>
            </div>
          )}
          {isChecking && !anyError && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <Loader size={40} className="mx-auto text-blue-500 animate-spin mb-3" />
              <h3 className="text-base font-semibold text-blue-800">Memeriksa Koneksi...</h3>
            </div>
          )}
        </>
      )}
    </div>
  );
}
