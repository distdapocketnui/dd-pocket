"use client";

import { useState, useEffect, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import StatCard from "@/components/ui/StatCard";
import DonutChart from "@/components/ui/DonutChart";
import LineChart from "@/components/ui/LineChart";
import { FileText, CheckCircle, Wrench, CheckCheck, BarChart3, Shield, AlertTriangle, Clock } from "lucide-react";
import type { LaporanP2B } from "@/types";

export default function DashboardPage() {
  const { switchGears } = useData();
  const { user } = useAuth();
  const isVisitor = user?.role === "Visitor";
  const [laporanData, setLaporanData] = useState<LaporanP2B[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("laporan_p2b")
        .select("*")
        .order("nama");
      if (data) setLaporanData(data as LaporanP2B[]);
    };
    fetch();
  }, []);

  const aktif = switchGears.filter((s) => s.status === "Aktif Lototo").length;
  const maintenance = switchGears.filter((s) => s.status === "Maintenance").length;
  const selesai = switchGears.filter((s) => s.status === "Selesai").length;

  // ── Filter data bulan berjalan ──
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const filteredLaporan = laporanData.filter((r) => {
    const d = new Date(r.tanggal_jam);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // ── Rekap P2B per PIC (sama dengan chart) ──
  const rekapMap = new Map<string, { pengaturanBeban: number; inspeksi: number; lainnya: number }>();

  filteredLaporan.forEach((r) => {
    const pics = r.pic ? r.pic.split(", ").filter(Boolean) : ["Tanpa PIC"];
    pics.forEach((pic) => {
      if (!rekapMap.has(pic)) {
        rekapMap.set(pic, { pengaturanBeban: 0, inspeksi: 0, lainnya: 0 });
      }
      const entry = rekapMap.get(pic)!;
      if (r.kegiatan === "Pengaturan Beban") entry.pengaturanBeban++;
      else if (r.kegiatan === "Inspeksi") entry.inspeksi++;
      else if (r.kegiatan === "Lainnya") entry.lainnya++;
    });
  });

  const rekapRows = Array.from(rekapMap.entries())
    .map(([nama, counts]) => ({ nama, ...counts }))
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const totalPengaturanBeban = rekapRows.reduce((sum, r) => sum + r.pengaturanBeban, 0);
  const totalInspeksi = rekapRows.reduce((sum, r) => sum + r.inspeksi, 0);
  const totalLainnya = rekapRows.reduce((sum, r) => sum + r.lainnya, 0);
  const totalAll = totalPengaturanBeban + totalInspeksi + totalLainnya;

  // ── Chart: jumlah inputan per nama ──
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLaporan.forEach((r) => {
      const pics = r.pic ? r.pic.split(", ").filter(Boolean) : ["Tanpa PIC"];
      pics.forEach((pic) => {
        counts[pic] = (counts[pic] || 0) + 1;
      });
    });
    return { labels: Object.keys(counts), data: Object.values(counts) };
  }, [filteredLaporan]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring LOTOTO</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoring pengamanan switch gear dan status LOTOTO pra maintenance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CheckCheck} label="SG Selesai" value={selesai} subtext="Selesai Lototo/Maintenance" variant="red" />
        <StatCard icon={CheckCircle} label="Lototo Aktif" value={aktif} subtext="Dalam pengamanan" variant="green" href="/lototo" />
        <StatCard icon={Wrench} label="SG Maintenance" value={maintenance} subtext="Sedang maintenance" variant="yellow" href="/sg-maintenance" />
        <StatCard icon={FileText} label="Laporan P2B" value={laporanData.length} subtext="Total aktivitas" variant="blue" href="/laporan-p2b" />
      </div>

      {/* Chart + Info / Rekap P2B */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Overview Status
          </h3>
          <DonutChart aktif={aktif} maintenance={maintenance} selesai={selesai} mode="combined" />
        </div>

        {isVisitor ? (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Informasi Cepat
            </h3>
            <div className="space-y-3">
              {[
                { icon: Shield, color: "bg-blue-50 text-blue-600", title: "Prosedur LOTOTO", desc: "Pastikan lockout/tagout sesuai prosedur" },
                { icon: AlertTriangle, color: "bg-amber-50 text-amber-600", title: "Maintenance Aktif", desc: `${maintenance} switch gear sedang dalam perawatan` },
                { icon: Clock, color: "bg-emerald-50 text-emerald-600", title: "Last Updated", desc: "Data real-time monitoring switch gear" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3.5 p-3.5 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Rekap Laporan Harian P2B
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 w-10">No.</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Nama Personil</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Pengaturan Beban</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Inspeksi</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Lainnya</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">Belum ada data</td>
                    </tr>
                  ) : (
                    rekapRows.map((row, idx) => (
                      <tr key={row.nama} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-gray-800">{row.nama}</td>
                        <td className="py-2 px-3 text-center text-gray-700">{row.pengaturanBeban}</td>
                        <td className="py-2 px-3 text-center text-gray-700">{row.inspeksi}</td>
                        <td className="py-2 px-3 text-center text-gray-700">{row.lainnya}</td>
                      </tr>
                    ))
                  )}
                  {rekapRows.length > 0 && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-2 px-3" colSpan={1}></td>
                      <td className="py-2 px-3 text-gray-800">Total</td>
                      <td className="py-2 px-3 text-center text-gray-800">{totalPengaturanBeban}</td>
                      <td className="py-2 px-3 text-center text-gray-800">{totalInspeksi}</td>
                      <td className="py-2 px-3 text-center text-gray-800">{totalLainnya}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Chart Pencapaian — hanya untuk non-Visitor */}
      {!isVisitor && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Statistik Inputan Laporan</h3>
          </div>
          <LineChart labels={chartData.labels} data={chartData.data} label="Jumlah Inputan" />
        </div>
      )}
    </div>
  );
}
