"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { calculateIdleTime, type IdleTimeResult } from "@/lib/equipment-api";
import DataTable from "@/components/ui/DataTable";
import LineChart from "@/components/ui/LineChart";
import { downloadPdf } from "@/lib/pdf";
import { formatPeriod, toIndonesianDate } from "@/lib/date";
import { Loader2, Download, Calendar, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { logger } from "@/lib/logger";

interface EquipmentIdleTime {
  equipment_name: string;
  unit: string;
  total_running_hours: number;
  total_idle_hours: number;
  availability: number;
  last_status: "Running" | "Stopped" | null;
}

interface UnitIdleTime {
  unit: string;
  total_running_hours: number;
  total_idle_hours: number;
  availability: number;
  equipment_count: number;
}

const IDLE_TIME_THRESHOLD = 4; // Jam - alert jika idle time > 4 jam

export default function LaporanIdleTimePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("Admin");
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [equipmentData, setEquipmentData] = useState<EquipmentIdleTime[]>([]);
  const [unitData, setUnitData] = useState<UnitIdleTime[]>([]);
  const [units, setUnits] = useState<string[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const idleData = await calculateIdleTime({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        unit_filter: selectedUnit !== "Semua" ? selectedUnit : undefined,
      });
      
      // Process equipment data
      const equipmentMap = new Map<string, EquipmentIdleTime>();
      
      (idleData || []).forEach((row: IdleTimeResult) => {
        const key = row.equipment_name;
        if (!equipmentMap.has(key)) {
          equipmentMap.set(key, {
            equipment_name: row.equipment_name,
            unit: row.unit,
            total_running_hours: 0,
            total_idle_hours: 0,
            availability: 0,
            last_status: row.last_event_type === "START" ? "Running" : row.last_event_type === "STOP" ? "Stopped" : null,
          });
        }
        
        const entry = equipmentMap.get(key)!;
        if (row.idle_time_hours) entry.total_idle_hours += parseFloat(row.idle_time_hours.toString());
        if (row.running_time_hours) entry.total_running_hours += parseFloat(row.running_time_hours.toString());
      });
      
      // Calculate availability
      equipmentMap.forEach(entry => {
        const total = entry.total_running_hours + entry.total_idle_hours;
        entry.availability = total > 0 ? (entry.total_running_hours / total) * 100 : 0;
      });
      
      const equipmentArray = Array.from(equipmentMap.values());
      setEquipmentData(equipmentArray);
      
      // Aggregate by unit
      const unitMap = new Map<string, UnitIdleTime>();
      equipmentArray.forEach(eq => {
        if (!unitMap.has(eq.unit)) {
          unitMap.set(eq.unit, {
            unit: eq.unit,
            total_running_hours: 0,
            total_idle_hours: 0,
            availability: 0,
            equipment_count: 0,
          });
        }
        const entry = unitMap.get(eq.unit)!;
        entry.total_running_hours += eq.total_running_hours;
        entry.total_idle_hours += eq.total_idle_hours;
        entry.equipment_count += 1;
      });
      
      unitMap.forEach(entry => {
        const total = entry.total_running_hours + entry.total_idle_hours;
        entry.availability = total > 0 ? (entry.total_running_hours / total) * 100 : 0;
      });
      
      setUnitData(Array.from(unitMap.values()));
      
      // Get unique units
      const uniqueUnits = Array.from(new Set(equipmentArray.map(eq => eq.unit))).sort();
      setUnits(uniqueUnits);
      
    } catch (err) {
      logger.error('fetch idle time error', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUnit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered data
  const filteredEquipmentData = selectedUnit === "Semua" 
    ? equipmentData 
    : equipmentData.filter(eq => eq.unit === selectedUnit);

  // Top 5 equipment with highest idle time
  const topIdleEquipment = useMemo(() => {
    return [...equipmentData]
      .sort((a, b) => b.total_idle_hours - a.total_idle_hours)
      .slice(0, 5);
  }, [equipmentData]);

  // Chart data
  const chartData = useMemo(() => {
    const labels = filteredEquipmentData.map(eq => eq.equipment_name);
    const runningData = filteredEquipmentData.map(eq => eq.total_running_hours);
    return { labels, runningData };
  }, [filteredEquipmentData]);

  // Download PDF
  const handleDownloadPdf = () => {
    const columns = ["Equipment", "Unit", "Running Time (Jam)", "Idle Time (Jam)", "Availability (%)"];
    const rows = filteredEquipmentData.map(eq => [
      eq.equipment_name,
      eq.unit,
      eq.total_running_hours.toFixed(2),
      eq.total_idle_hours.toFixed(2),
      eq.availability.toFixed(1),
    ]);

    downloadPdf({
      title: "Laporan Idle Time Equipment",
      period: formatPeriod(startDate, endDate),
      columns,
      rows,
      filename: `Laporan_IdleTime_${startDate || "all"}_${endDate || "all"}`,
    });
  };

  // Table columns for equipment
  const equipmentColumns = [
    { key: "equipment_name", header: "Equipment", render: (eq: EquipmentIdleTime) => <span className="font-semibold">{eq.equipment_name}</span> },
    { key: "unit", header: "Unit", render: (eq: EquipmentIdleTime) => eq.unit },
    { 
      key: "total_running_hours", 
      header: "Running Time (Jam)", 
      render: (eq: EquipmentIdleTime) => <span className="text-green-600 font-semibold">{eq.total_running_hours.toFixed(2)}</span> 
    },
    { 
      key: "total_idle_hours", 
      header: "Idle Time (Jam)", 
      render: (eq: EquipmentIdleTime) => (
        <span className={`${eq.total_idle_hours > IDLE_TIME_THRESHOLD ? "text-red-600 font-bold" : "text-amber-600"} font-semibold`}>
          {eq.total_idle_hours.toFixed(2)}
          {eq.total_idle_hours > IDLE_TIME_THRESHOLD && <AlertTriangle size={14} className="inline ml-1" />}
        </span>
      )
    },
    { 
      key: "availability", 
      header: "Availability (%)", 
      render: (eq: EquipmentIdleTime) => (
        <span className={`font-semibold ${eq.availability >= 90 ? "text-green-600" : eq.availability >= 70 ? "text-amber-600" : "text-red-600"}`}>
          {eq.availability.toFixed(1)}%
        </span>
      )
    },
    { 
      key: "last_status", 
      header: "Status", 
      render: (eq: EquipmentIdleTime) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          eq.last_status === "Running" ? "bg-green-100 text-green-700" :
          eq.last_status === "Stopped" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {eq.last_status || "Unknown"}
        </span>
      )
    },
  ];

  // Table columns for unit
  const unitColumns = [
    { key: "unit", header: "Unit", render: (u: UnitIdleTime) => <span className="font-semibold">{u.unit}</span> },
    { key: "equipment_count", header: "Jumlah Equipment", render: (u: UnitIdleTime) => u.equipment_count },
    { 
      key: "total_running_hours", 
      header: "Total Running Time (Jam)", 
      render: (u: UnitIdleTime) => <span className="text-green-600 font-semibold">{u.total_running_hours.toFixed(2)}</span> 
    },
    { 
      key: "total_idle_hours", 
      header: "Total Idle Time (Jam)", 
      render: (u: UnitIdleTime) => <span className="text-amber-600 font-semibold">{u.total_idle_hours.toFixed(2)}</span> 
    },
    { 
      key: "availability", 
      header: "Availability (%)", 
      render: (u: UnitIdleTime) => (
        <span className={`font-semibold ${u.availability >= 90 ? "text-green-600" : u.availability >= 70 ? "text-amber-600" : "text-red-600"}`}>
          {u.availability.toFixed(1)}%
        </span>
      )
    },
  ];

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-500">Halaman ini hanya dapat diakses oleh Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Idle Time Equipment</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoring waktu idle dan availability peralatan</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <Calendar size={14} /> Filter
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="Semua">Semua Unit</option>
            {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
          <button
            onClick={handleDownloadPdf}
            disabled={equipmentData.length === 0}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock size={16} />
            <span className="text-xs font-semibold">Total Equipment</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{equipmentData.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-semibold">Avg Running Time</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {equipmentData.length > 0 
              ? (equipmentData.reduce((sum, eq) => sum + eq.total_running_hours, 0) / equipmentData.length).toFixed(1)
              : "0"} Jam
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock size={16} />
            <span className="text-xs font-semibold">Avg Idle Time</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {equipmentData.length > 0 
              ? (equipmentData.reduce((sum, eq) => sum + eq.total_idle_hours, 0) / equipmentData.length).toFixed(1)
              : "0"} Jam
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-semibold">Avg Availability</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {equipmentData.length > 0 
              ? (equipmentData.reduce((sum, eq) => sum + eq.availability, 0) / equipmentData.length).toFixed(1)
              : "0"}%
          </div>
        </div>
      </div>

      {/* Top Idle Equipment */}
      {topIdleEquipment.length > 0 && topIdleEquipment[0].total_idle_hours > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-amber-600" size={18} />
            <h3 className="text-sm font-semibold text-amber-800">Top 5 Equipment dengan Idle Time Tertinggi</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {topIdleEquipment.map((eq, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-xs font-semibold text-gray-700 mb-1">{eq.equipment_name}</div>
                <div className="text-xs text-gray-500">{eq.unit}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600">{eq.total_idle_hours.toFixed(1)} Jam</span>
                  <span className={`text-xs font-semibold ${eq.availability >= 70 ? "text-green-600" : "text-red-600"}`}>
                    {eq.availability.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.labels.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Running Time per Equipment</h3>
          </div>
          <div className="h-80">
            <LineChart 
              labels={chartData.labels} 
              data={chartData.runningData} 
              label="Running Time (Jam)" 
            />
          </div>
        </div>
      )}

      {/* Tables */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Equipment Table */}
          <DataTable
            title="Idle Time per Equipment"
            columns={equipmentColumns}
            data={filteredEquipmentData}
            searchPlaceholder="Cari equipment..."
          />

          {/* Unit Table */}
          <DataTable
            title="Rekap per Unit"
            columns={unitColumns}
            data={unitData}
            searchable={false}
          />
        </div>
      )}
    </div>
  );
}