"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import {
  getEquipment,
  getEquipmentLogs,
  type Equipment,
  type EquipmentLogWithDetails
} from "@/lib/equipment-api";
import { downloadPdfMulti } from "@/lib/pdf";
import { formatPeriod, toIndonesianDate } from "@/lib/date";
import { Download, Calendar, Loader2, FileSpreadsheet } from "lucide-react";
import { logger } from "@/lib/logger";
import * as XLSX from "xlsx";
import { canAccessRoute } from "@/lib/route-protection";

interface EquipmentOperationStatus {
  equipment: Equipment;
  startTime: string | null;
  runningHours: number;
  stopHours: number;
  availability: number;
  status: "Running" | "Stopped" | "Unknown";
  lastEvent: "START" | "STOP" | null;
  lastEventTime: string | null;
  reason: string | null;
}

const OPERATION_CATEGORIES = [
  { name: "Raw Mill", label: "Status Operasi Raw Mill" },
  { name: "Kiln", label: "Status Operasi Kiln" },
  { name: "Finish Mill", label: "Status Operasi Finish Mill" },
  { name: "Coal Mill", label: "Status Operasi Coal Mill" },
  { name: "Packer", label: "Status Operasi Packer" },
  { name: "Crusher", label: "Status Operasi Crusher" },
];

export default function LaporanOperasiSdPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Proteksi route: redirect ke dashboard jika role tidak punya akses
  useEffect(() => {
    if (!canAccessRoute("/lap-operasi-bulanan", user?.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<EquipmentLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to current month
    const now = new Date();
    return now.toISOString().slice(0, 7); // YYYY-MM
  });
  const [selectedUnit, setSelectedUnit] = useState("Semua");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeCategory, setActiveCategory] = useState<string>('Raw Mill');

  // Fetch equipment list
  const fetchEquipment = useCallback(async () => {
    try {
      const data = await getEquipment(false); // Get all equipment (active and inactive)
      setEquipmentList(data);
    } catch (err) {
      logger.error('fetch equipment error', err);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const data = await getEquipmentLogs();
      setLogs(data);
      setLastRefresh(new Date());
    } catch (err) {
      logger.error('fetch logs error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
    fetchLogs();

    // Auto-refresh every 60 seconds
    let timer: ReturnType<typeof setInterval>;
    const start = () => { timer = setInterval(fetchLogs, 60000); };
    const stop = () => { if (timer) clearInterval(timer); };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") { fetchLogs(); start(); }
      else { stop(); }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => { stop(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [fetchEquipment, fetchLogs]);

  // Filter logs by selected month
  const filteredLogs = logs.filter(log => {
    if (selectedMonth) {
      const logDate = new Date(log.timestamp);
      const logMonth = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
      return logMonth === selectedMonth;
    }
    return true;
  });

  // Calculate operation status for equipment in a category
  const calculateOperationStatus = (equipment: Equipment): EquipmentOperationStatus => {
    // Determine the date range to analyze based on selected month
    let dayStart: Date;
    let dayEnd: Date;
    
    if (selectedMonth) {
      // Selected month: first day 00:00 to yesterday 23:59:59
      const [year, month] = selectedMonth.split('-').map(Number);
      const today = new Date();
      const selectedMonthDate = new Date(year, month - 1, 1);
      
      // Check if selected month is current month
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
      
      dayStart = new Date(year, month - 1, 1, 0, 0, 0);
      
      if (isCurrentMonth) {
        // If current month, end at yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      } else {
        // If past month, end at last day of month
        dayEnd = new Date(year, month, 0, 23, 59, 59, 999);
      }
    } else {
      // No filter: current month 00:00 to yesterday 23:59:59
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      dayStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      dayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    }

    // Get all logs for this equipment and sort them
    const allEquipmentLogs = logs
      .filter(log => log.equipment_id === equipment.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Filter logs within the date range
    const equipmentLogs = allEquipmentLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= dayStart && logDate <= dayEnd;
    });

    // Find the last event before dayStart to determine initial state
    let initialStatus: "START" | "STOP" | null = null;
    const beforeLogs = logs
      .filter(log => log.equipment_id === equipment.id && new Date(log.timestamp) < dayStart)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (beforeLogs.length > 0) {
      initialStatus = beforeLogs[0].event_type as "START" | "STOP";
    }
    
    // If no events before dayStart, check if there are any events at all
    if (beforeLogs.length === 0) {
      const allLogs = logs
        .filter(log => log.equipment_id === equipment.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (allLogs.length > 0) {
        initialStatus = allLogs[0].event_type as "START" | "STOP";
      }
    }

    let runningHours = 0;
    let stopHours = 0;
    let lastEvent: "START" | "STOP" | null = null;
    let lastEventTime: string | null = null;
    let lastReason: string | null = null;
    let currentState: "START" | "STOP" | null = initialStatus;

    // Process events within the day
    for (let i = 0; i < equipmentLogs.length; i++) {
      const log = equipmentLogs[i];
      const logTime = new Date(log.timestamp);

      if (log.event_type === "START") {
        // If previously stopped or unknown, calculate stop time until this START
        if (currentState === "STOP" || currentState === null) {
          const prevEventTime = i > 0 ? new Date(equipmentLogs[i - 1].timestamp) : dayStart;
          const hours = (logTime.getTime() - prevEventTime.getTime()) / (1000 * 60 * 60);
          if (hours > 0) {
            stopHours += hours;
          }
        }
        currentState = "START";
        lastEvent = "START";
        lastEventTime = log.timestamp;
      } else if (log.event_type === "STOP") {
        // If previously started, calculate running time until this STOP
        if (currentState === "START") {
          const prevEventTime = i > 0 ? new Date(equipmentLogs[i - 1].timestamp) : dayStart;
          const hours = (logTime.getTime() - prevEventTime.getTime()) / (1000 * 60 * 60);
          if (hours > 0) {
            runningHours += hours;
          }
        }
        currentState = "STOP";
        lastEvent = "STOP";
        lastEventTime = log.timestamp;
        lastReason = log.reason;
      }
    }

    // Debug: log the calculation
    console.log(`Equipment: ${equipment.name}, initialStatus: ${initialStatus}, currentState: ${currentState}, runningHours: ${runningHours}, stopHours: ${stopHours}`);

    // Calculate remaining time until end of day (24:00)
    const lastLogTime = equipmentLogs.length > 0 ? new Date(equipmentLogs[equipmentLogs.length - 1].timestamp) : dayStart;
    const remainingHours = (dayEnd.getTime() - lastLogTime.getTime()) / (1000 * 60 * 60);
    
    if (remainingHours > 0) {
      if (currentState === "START") {
        runningHours += remainingHours;
      } else if (currentState === "STOP") {
        stopHours += remainingHours;
      } else {
        // No events today, use initial status
        if (initialStatus === "START") {
          runningHours += remainingHours;
        } else if (initialStatus === "STOP") {
          stopHours += remainingHours;
        }
      }
    }

    // Ensure total equals 24 hours (or less if today and not yet 24h)
    const totalHours = runningHours + stopHours;
    const availability = totalHours > 0 ? (runningHours / totalHours) * 100 : 0;

    // Determine current status
    let currentStatus: "Running" | "Stopped" | "Unknown" = "Unknown";
    if (currentState === "START") {
      currentStatus = "Running";
    } else if (currentState === "STOP") {
      currentStatus = "Stopped";
    } else if (initialStatus === "START") {
      currentStatus = "Running";
    } else if (initialStatus === "STOP") {
      currentStatus = "Stopped";
    }

    return {
      equipment,
      startTime: lastEvent === "START" ? lastEventTime : null,
      runningHours: Math.round(runningHours * 100) / 100,
      stopHours: Math.round(stopHours * 100) / 100,
      availability: Math.round(availability * 100) / 100,
      status: currentStatus,
      lastEvent,
      lastEventTime,
      reason: lastReason,
    };
  };

  // Get unique units
  const units = Array.from(new Set(equipmentList.map(e => e.unit))).sort();

  // Check if category filter should be disabled
  const isCategoryDisabled = selectedUnit !== "Semua";

  // Get operation status for all equipment grouped by category
  const getOperationStatusByCategory = (category: string) => {
    let categoryEquipment = equipmentList.filter(eq => 
      eq.category === category || eq.name.includes(category) || eq.unit.includes(category)
    );
    
    // Filter by selected unit if not "Semua"
    if (selectedUnit !== "Semua") {
      categoryEquipment = categoryEquipment.filter(eq => eq.unit === selectedUnit);
    }
    
    return categoryEquipment.map(eq => calculateOperationStatus(eq));
  };

  // Filter categories based on selected category (for segmented control)
  const filteredCategories = OPERATION_CATEGORIES.filter(cat => cat.name === activeCategory);

  // For download, use selectedCategory filter (not activeCategory segment)
  const downloadCategories = selectedCategory === "Semua"
    ? OPERATION_CATEGORIES
    : OPERATION_CATEGORIES.filter(cat => cat.name === selectedCategory);

  // Download PDF for all categories in one file with separate tables
  const handleDownloadPdf = () => {
    const allSections: { title: string; columns: string[]; rows: string[][] }[] = [];

    // Collect all data from downloadCategories
    downloadCategories.forEach((category) => {
      const categoryData = getOperationStatusByCategory(category.name);
      if (categoryData.length === 0) return;

      const columns = ["Equipment", "Running (Jam)", "Stop (Jam)", "Availability (%)", "Status", "Keterangan"];
      const rows = categoryData.map(item => [
        item.equipment.name,
        item.runningHours.toFixed(1),
        item.stopHours.toFixed(1),
        item.availability.toFixed(1),
        item.status,
        item.reason || "-",
      ]);

      allSections.push({
        title: category.label,
        columns,
        rows,
      });
    });

    if (allSections.length === 0) {
      alert("Tidak ada data untuk di-download");
      return;
    }

    // Download as a single PDF with multiple separate tables
    downloadPdfMulti({
      title: "Laporan Operasi Equipment",
      period: selectedMonth ? `Bulan: ${selectedMonth}` : 'Semua Bulan',
      sections: allSections,
      filename: `Laporan_Operasi_${selectedMonth || "all"}`,
    });
  };

  // Download Excel for all categories
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    
    downloadCategories.forEach((category) => {
      const categoryData = getOperationStatusByCategory(category.name);
      if (categoryData.length === 0) return;

      const data = categoryData.map(item => ({
        "Equipment": item.equipment.name,
        "Running (Jam)": item.runningHours.toFixed(1),
        "Stop (Jam)": item.stopHours.toFixed(1),
        "Availability (%)": item.availability.toFixed(1),
        "Status": item.status,
        "Keterangan": item.reason || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, category.label.substring(0, 31));
    });

    const filename = `Laporan_Operasi_${selectedMonth || "all"}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Manual refresh
  const handleRefresh = () => {
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lap. Operasi Bulanan</h1>
        <p className="text-sm text-gray-500 mt-1">Laporan operasi dan ketersediaan peralatan</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <Calendar size={14} /> Filter
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-2">
          {/* Month filter - full width on mobile, 1 column on desktop */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="col-span-1 lg:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          
          {/* Unit filter */}
          <select
            value={selectedUnit}
            onChange={(e) => { setSelectedUnit(e.target.value); setSelectedCategory("Semua"); }}
            className="col-span-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="Semua">Semua Unit</option>
            {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
          
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={isCategoryDisabled}
            className="col-span-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="Semua">Semua Kategori</option>
            {OPERATION_CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.label}</option>)}
          </select>
          
          {/* Download buttons - 2 columns */}
          <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={loading}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet size={14} />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID')}
        </div>
      </div>

      {/* Segmented Control - Filter Kategori */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex gap-1 w-full">
          {OPERATION_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex-1 px-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                activeCategory === cat.name
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tables by Category */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((category) => {
            const categoryData = getOperationStatusByCategory(category.name);
            
            if (categoryData.length === 0) return null;

            return (
              <div key={category.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">{category.label}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-200 border-b-2 border-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Equipment</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">Running (Jam)</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">Stop (Jam)</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">Availability</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {categoryData.map((item) => (
                        <tr key={item.equipment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`text-sm font-semibold ${
                              item.status === "Stopped" ? "text-rose-600" : "text-gray-900"
                            }`}>{item.equipment.name}</div>
                            <div className="text-xs text-gray-500">{item.equipment.unit}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-medium text-green-600">{item.runningHours.toFixed(1)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-medium text-red-600">{item.stopHours.toFixed(1)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    item.availability >= 100 ? 'bg-green-500' :
                                    item.availability >= 60 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  }`} 
                                  style={{ width: `${Math.min(item.availability, 100)}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${
                                item.availability >= 100 ? 'text-green-600' :
                                item.availability >= 60 ? 'text-orange-600' :
                                'text-red-600'
                              }`}>{item.availability.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.status === "Running" 
                                ? "bg-green-600 text-white" 
                                : item.status === "Stopped"
                                ? "bg-rose-500 text-white"
                                : "bg-gray-300 text-gray-700"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {item.reason || "-"}
                            {item.lastEventTime && (
                              <div className="text-xs text-gray-400 mt-1">
                                {item.lastEvent}: {toIndonesianDate(item.lastEventTime)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {OPERATION_CATEGORIES.every(cat => getOperationStatusByCategory(cat.name).length === 0) && (
            <div className="text-center py-12 text-gray-400">
              Tidak ada data equipment untuk ditampilkan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
