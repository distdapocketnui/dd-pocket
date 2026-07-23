"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import StatCard from "@/components/ui/StatCard";
import { DonutChart, LineChart } from "@/components/ui/charts";
import BarChart from "@/components/ui/BarChart";
import { FileText, CheckCircle, Wrench, CheckCheck, BarChart3, Shield, AlertTriangle, Clock } from "lucide-react";
import type { LaporanP2B } from "@/types";
import { getEquipment, getEquipmentLogs, type Equipment, type EquipmentLogWithDetails } from "@/lib/equipment-api";
import { logger } from "@/lib/logger";

export default function DashboardPage() {
  const { switchGears } = useData();
  const { user } = useAuth();
  const isVisitor = user?.role === "Visitor";
  const [laporanData, setLaporanData] = useState<LaporanP2B[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLogWithDetails[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [activeUnit, setActiveUnit] = useState<string>("");

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

  // Fetch equipment list
  const fetchEquipment = useCallback(async () => {
    try {
      const data = await getEquipment(true);
      setEquipmentList(data);
    } catch (err) {
      logger.error('fetch equipment error', err);
    }
  }, []);

  // Fetch equipment logs
  const fetchEquipmentLogs = useCallback(async () => {
    try {
      const data = await getEquipmentLogs();
      setEquipmentLogs(data);
    } catch (err) {
      logger.error('fetch equipment logs error', err);
    } finally {
      setEquipmentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
    fetchEquipmentLogs();

    // Auto-refresh every 30 seconds
    let timer: ReturnType<typeof setInterval>;
    const start = () => { timer = setInterval(fetchEquipmentLogs, 30000); };
    const stop = () => { if (timer) clearInterval(timer); };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") { fetchEquipmentLogs(); start(); }
      else { stop(); }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => { stop(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [fetchEquipment, fetchEquipmentLogs]);

  // Get last event for equipment
  const getLastEvent = (equipmentId: number): "START" | "STOP" | "HEATING_UP" | null => {
    const eqLogs = equipmentLogs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return eqLogs.length > 0 ? eqLogs[0].event_type as "START" | "STOP" | "HEATING_UP" : null;
  };

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

  // ── Rekap P2B per kegiatan ──
  const totalPengaturanBeban = filteredLaporan.filter((r) => r.kegiatan === "Pengaturan Beban").length;
  const totalInspeksi = filteredLaporan.filter((r) => r.kegiatan === "Inspeksi").length;
  const totalLainnya = filteredLaporan.filter((r) => r.kegiatan === "Lainnya").length;
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

  // Get unique units
  const units = Array.from(new Set(equipmentList.map(e => e.unit))).sort();

  // Auto-select first unit on load
  useEffect(() => {
    if (!activeUnit && units.length > 0) {
      setActiveUnit(units[0]);
    }
  }, [activeUnit, units]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rekap Aktifitas Seksi Pengaturan Beban</h1>
        <p className="text-sm text-gray-500 mt-1">Semua kegiatan pengaturan/pengamanan Switchgear (LOTOTO) yang dilakukan oleh seksi Pengaturan beban</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CheckCheck} label="Total SG Selesai" value={selesai} subtext="Selesai Lototo/Maintenance" variant="green" />
        <StatCard icon={CheckCircle} label="Lototo Aktif" value={aktif} subtext="Dalam pengamanan" variant="red" href="/lototo" />
        <StatCard icon={Wrench} label="SG Maintenance" value={maintenance} subtext="Sedang maintenance" variant="yellow" href="/sg-maintenance" />
        {!isVisitor && <StatCard icon={FileText} label="Laporan P2B" value={laporanData.length} subtext="Total aktivitas" variant="blue" href="/laporan-p2b" />}
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
          <div className="hidden lg:block">
            {/* Bar Chart: Count per Kegiatan — desktop only in grid */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Jumlah Laporan per Kegiatan
              </h3>
              <BarChart
                labels={["Pengaturan Beban", "Inspeksi", "Lainnya"]}
                data={[totalPengaturanBeban, totalInspeksi, totalLainnya]}
                label="Jumlah Laporan"
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Equipment per Unit */}
      {!equipmentLoading && units.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Status Peralatan</h2>
          
          {/* Segmented Control - Filter Unit */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
            <div className="flex gap-1 w-full">
              {units.map((unit) => (
                <button
                  key={unit}
                  onClick={() => setActiveUnit(unit)}
                  className={`flex-1 px-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    activeUnit === unit
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {units
            .filter(unit => activeUnit === unit)
            .map(unit => {
            const unitEquipment = equipmentList.filter(eq => eq.unit === unit);
            
            // Calculate unit status summary
            const unitStatuses = unitEquipment.map(eq => {
              const lastEvent = getLastEvent(eq.id);
              return lastEvent === "START" ? "Running" : lastEvent === "STOP" ? "Stopped" : "Unknown";
            });
            const runningCount = unitStatuses.filter(s => s === "Running").length;
            const stoppedCount = unitStatuses.filter(s => s === "Stopped").length;
            const totalCount = unitEquipment.length;
            
            // Determine unit overall status color
            let unitStatusColor = "bg-gray-100 text-gray-700";
            let unitStatusText = "Unknown";
            if (runningCount > 0 && stoppedCount === 0) {
              unitStatusColor = "bg-green-100 text-green-700";
              unitStatusText = "All Running";
            } else if (stoppedCount > 0 && runningCount === 0) {
              unitStatusColor = "bg-red-100 text-red-700";
              unitStatusText = "All Stopped";
            } else if (runningCount > 0 && stoppedCount > 0) {
              unitStatusColor = "bg-amber-100 text-amber-700";
              unitStatusText = "Mixed";
            }
            
            return (
              <div key={unit} className="space-y-3">
                {/* Unit Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">{unit}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${unitStatusColor}`}>
                    {unitStatusText} ({runningCount}/{totalCount})
                  </span>
                </div>
                
                {/* Equipment Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {unitEquipment.map(eq => {
                    const lastEvent = getLastEvent(eq.id);
                    const status = lastEvent === "START" ? "Running" : lastEvent === "HEATING_UP" ? "Heating" : lastEvent === "STOP" ? "Stopped" : "Unknown";
                    const statusColor = status === "Running" ? "bg-green-500 text-white" : status === "Heating" ? "bg-orange-500 text-white" : status === "Stopped" ? "bg-red-500 text-white" : "bg-gray-300 text-gray-700";
                    const cardBg = status === "Running" ? "bg-green-50 border-green-500" : status === "Heating" ? "bg-orange-50 border-orange-500" : status === "Stopped" ? "bg-red-50 border-red-500" : "bg-white border-gray-100";
                    
                    // Get posisi_power from last log for this equipment
                    const eqLogs = equipmentLogs.filter(log => log.equipment_id === eq.id);
                    const lastLog = eqLogs.length > 0 ? eqLogs[0] : null;
                    const posisiPower = lastLog?.posisi_power || null;
                    
                    return (
                      <div 
                        key={eq.id} 
                        className={`rounded-xl shadow-sm border px-4 py-3 flex items-center justify-between ${cardBg}`}
                        style={{ position: 'relative', overflow: 'hidden' }}
                      >
                        {posisiPower && (
                          <div 
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '-22px',
                              transform: 'rotate(45deg)',
                              backgroundColor: posisiPower === 'BTG' ? '#3b82f6' : '#eab308',
                              color: 'white',
                              fontSize: '9px',
                              fontWeight: '800',
                              padding: '4px 36px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              zIndex: 10,
                              pointerEvents: 'none',
                              textAlign: 'center',
                            }}
                          >
                            {posisiPower}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{eq.name}</div>
                          <div className="text-xs text-blue-600 font-medium">
                            {lastLog ? [lastLog.main1, lastLog.main2, lastLog.main3].filter(Boolean).join(", ") : [eq.main1, eq.main2, eq.main3].filter(Boolean).join(", ")}
                          </div>
                          <div className="text-xs text-gray-500 italic">({eq.unit})</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile: BarChart + LineChart — after Equipment cards */}
      {!isVisitor && (
        <div className="lg:hidden space-y-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Jumlah Laporan per Kegiatan
            </h3>
            <BarChart
              labels={["Pengaturan Beban", "Inspeksi", "Lainnya"]}
              data={[totalPengaturanBeban, totalInspeksi, totalLainnya]}
              label="Jumlah Laporan"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Statistik Inputan Laporan</h3>
            </div>
            <LineChart labels={chartData.labels} data={chartData.data} label="Jumlah Inputan" />
          </div>
        </div>
      )}

      {/* Chart Pencapaian — desktop only */}
      {!isVisitor && (
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-4">
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
