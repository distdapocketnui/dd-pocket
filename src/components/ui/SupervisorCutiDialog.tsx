"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { User } from "@/types";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetSupervisorId: number | null) => void;
}

export default function SupervisorCutiDialog({ open, onClose, onConfirm }: Props) {
  const [step, setStep] = useState<"tanya" | "pilih">("tanya");
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state setiap dialog dibuka
  useEffect(() => {
    if (open) {
      setStep("tanya");
      setSelectedId(null);
    }
  }, [open]);

  const handleYa = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id, name, regu")
        .eq("role", "Supervisor")
        .eq("status", "Aktif")
        .order("name");
      if (data) setSupervisors(data as User[]);
    } catch (err) {
      logger.error('fetch supervisors error', err);
    } finally {
      setLoading(false);
    }
    setStep("pilih");
  };

  const handleTidak = () => {
    onConfirm(null);
  };

  const handleConfirmPilih = () => {
    if (selectedId) onConfirm(selectedId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm">
        {step === "tanya" ? (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Konfirmasi Supervisor</h3>
            <p className="text-sm text-gray-500 mb-6">Apakah Anda lembur/Supervisor anda CUTI?</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleTidak}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Tidak
              </button>
              <button
                onClick={handleYa}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Ya
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Pilih Supervisor Pengganti</h3>
            <p className="text-sm text-gray-500 mb-4">
              Supervisor anda sedang cuti. Pilih supervisor yang lembur untuk menyetujui permintaan ini.
            </p>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : supervisors.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-400">
                Tidak ada supervisor aktif ditemukan.
              </div>
            ) : (
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all mb-6"
              >
                <option value="">Pilih Supervisor</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.regu ? `(${s.regu})` : ""}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setStep("tanya")}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirmPilih}
                disabled={!selectedId}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Kirim
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
