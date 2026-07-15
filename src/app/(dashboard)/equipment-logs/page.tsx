"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  getEquipment, 
  getEquipmentLogs, 
  createEquipmentLog, 
  updateEquipmentLog, 
  deleteEquipmentLog,
  type Equipment,
  type EquipmentLogWithDetails 
} from "@/lib/equipment-api";
import DataTable from "@/components/ui/DataTable";
import { downloadPdf } from "@/lib/pdf";
import { formatPeriod, toIndonesianDate, toDatetimeLocal, getCurrentDatetimeLocal } from "@/lib/date";
import { Plus, Edit3, Trash2, Loader2, Download, Calendar, CheckCircle, XCircle } from "lucide-react";
import { logger } from "@/lib/logger";

const SHIFT_OPTIONS = ["Pagi", "Siang", "Malam", "Dayshift"];

export default function EquipmentLogsPage() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("Admin", "Supervisor", "Operator");
  const isAdmin = hasRole("Admin");

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<EquipmentLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EquipmentLogWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("Semua");
  const [selectedEquipment, setSelectedEquipment] = useState<number | "">("");
  const [eventType, setEventType] = useState<"START" | "STOP">("START");
  const [timestamp, setTimestamp] = useState(getCurrentDatetimeLocal());
  const [reason, setReason] = useState("");
  const [shift, setShift] = useState("Dayshift");

  // Fetch equipment list
  const fetchEquipment = useCallback(async () => {
    try {
      const data = await getEquipment(true);
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
    } catch (err) {
      logger.error('fetch logs error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
    fetchLogs();

    // Auto-refresh every 30 seconds
    let timer: ReturnType<typeof setInterval>;
    const start = () => { timer = setInterval(fetchLogs, 30000); };
    const stop = () => { if (timer) clearInterval(timer); };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") { fetchLogs(); start(); }
      else { stop(); }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => { stop(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [fetchEquipment, fetchLogs]);

  // Get unique units
  const units = Array.from(new Set(equipmentList.map(e => e.unit))).sort();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (startDate && endDate) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate < startDate || logDate > endDate) return false;
    }
    if (selectedUnit !== "Semua" && log.unit !== selectedUnit) return false;
    if (selectedEquipment && log.equipment_id !== selectedEquipment) return false;
    return true;
  });

  // Check if equipment can START (last event must be STOP or no event)
  const canStartEquipment = (equipmentId: number): boolean => {
    const equipmentLogs = logs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (equipmentLogs.length === 0) return true;
    return equipmentLogs[0].event_type === "STOP";
  };

  // Check if equipment can STOP (last event must be START)
  const canStopEquipment = (equipmentId: number): boolean => {
    const equipmentLogs = logs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (equipmentLogs.length === 0) return false;
    return equipmentLogs[0].event_type === "START";
  };

  // Get last event for equipment
  const getLastEvent = (equipmentId: number): "START" | "STOP" | null => {
    const equipmentLogs = logs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return equipmentLogs.length > 0 ? equipmentLogs[0].event_type as "START" | "STOP" : null;
  };

  // Handle save (add/edit)
  const handleSave = async () => {
    if (!selectedEquipment) {
      alert("Pilih equipment");
      return;
    }
    if (!timestamp) {
      alert("Tanggal & jam wajib diisi");
      return;
    }
    if (eventType === "STOP" && !reason.trim()) {
      alert("Alasan stop wajib diisi");
      return;
    }

    // Validasi
    if (eventType === "START" && !canStartEquipment(selectedEquipment)) {
      alert("Equipment harus di-STOP terlebih dahulu sebelum di-START");
      return;
    }
    if (eventType === "STOP" && !canStopEquipment(selectedEquipment)) {
      alert("Equipment harus di-START terlebih dahulu sebelum di-STOP");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        equipment_id: selectedEquipment,
        event_type: eventType,
        timestamp: timestamp,
        reason: eventType === "STOP" ? reason.trim() : null,
        shift: shift,
        created_by: user?.name || "",
      };

      if (editing) {
        await updateEquipmentLog(editing.id, payload);
      } else {
        await createEquipmentLog(payload);
      }

      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchLogs();
    } catch (err) {
      logger.error('save log error', err);
      alert("Gagal menyimpan data: " + (err as any)?.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      await deleteEquipmentLog(id);
      setConfirmDelete(null);
      fetchLogs();
    } catch (err) {
      logger.error('delete log error', err);
      alert("Gagal menghapus data");
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedEquipment("");
    setEventType("START");
    setTimestamp(getCurrentDatetimeLocal());
    setReason("");
    setShift("Dayshift");
    setEditing(null);
  };

  // Open edit form
  const openEdit = (log: EquipmentLogWithDetails) => {
    setEditing(log);
    setSelectedEquipment(log.equipment_id);
    setEventType(log.event_type as "START" | "STOP");
    setTimestamp(toDatetimeLocal(log.timestamp) || getCurrentDatetimeLocal());
    setReason(log.reason || "");
    setShift(log.shift || "Dayshift");
    setShowForm(true);
  };

  // Open add form
  const openAdd = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
  };

  // Download PDF
  const handleDownloadPdf = () => {
    const columns = ["Tanggal Jam", "Equipment", "Unit", "Event", "Shift", "Alasan", "Dibuat Oleh"];
    const rows = filteredLogs.map(log => [
      toIndonesianDate(log.timestamp),
      log.equipment_name,
      log.unit,
      log.event_type,
      log.shift || "-",
      log.reason || "-",
      log.created_by,
    ]);

    downloadPdf({
      title: "Laporan Start-Stop Equipment",
      period: formatPeriod(startDate, endDate),
      columns,
      rows,
      filename: `Laporan_StartStop_${startDate || "all"}_${endDate || "all"}`,
    });
  };

  // Table columns
  const columns = [
    { key: "timestamp", header: "Tanggal Jam", render: (log: EquipmentLogWithDetails) => <span className="font-semibold">{toIndonesianDate(log.timestamp)}</span> },
    { key: "equipment_name", header: "Equipment", render: (log: EquipmentLogWithDetails) => <span className="font-medium">{log.equipment_name}</span> },
    { key: "unit", header: "Unit", render: (log: EquipmentLogWithDetails) => log.unit },
    { 
      key: "event_type", 
      header: "Event", 
      render: (log: EquipmentLogWithDetails) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          log.event_type === "START" 
            ? "bg-green-100 text-green-700" 
            : "bg-red-100 text-red-700"
        }`}>
          {log.event_type === "START" ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {log.event_type}
        </span>
      )
    },
    { key: "shift", header: "Shift", render: (log: EquipmentLogWithDetails) => log.shift || "-" },
    { key: "reason", header: "Alasan", render: (log: EquipmentLogWithDetails) => log.reason || "-" },
    { key: "created_by", header: "Dibuat Oleh", render: (log: EquipmentLogWithDetails) => log.created_by },
    ...(canEdit ? [{
      key: "actions" as const,
      header: "Aksi",
      render: (log: EquipmentLogWithDetails) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(log)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            title="Edit"
          >
            <Edit3 size={15} />
          </button>
          <button
            onClick={() => setConfirmDelete(log.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Hapus"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Start-Stop Equipment</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoring start-stop operasional peralatan</p>
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
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua Equipment</option>
            {equipmentList.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name} ({eq.unit})</option>
            ))}
          </select>
          <button
            onClick={handleDownloadPdf}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Status Equipment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {equipmentList.map(eq => {
          const lastEvent = getLastEvent(eq.id);
          const status = lastEvent === "START" ? "Running" : lastEvent === "STOP" ? "Stopped" : "Unknown";
          const statusColor = status === "Running" ? "bg-green-100 text-green-700" : status === "Stopped" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600";
          
          return (
            <div key={eq.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">{eq.name}</div>
                <div className="text-xs text-gray-500">{eq.unit}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                {status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <DataTable
          title="Riwayat Start-Stop"
          columns={columns}
          data={filteredLogs}
          searchPlaceholder="Cari equipment..."
          actions={
            canEdit && (
              <button
                onClick={openAdd}
                className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus size={16} /> Tambah Data
              </button>
            )
          }
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editing ? "Edit Log" : "Tambah Log Start-Stop"}</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment *</label>
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                >
                  <option value="">Pilih Equipment</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.unit})
                    </option>
                  ))}
                </select>
                {selectedEquipment && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">Status terakhir: </span>
                    <span className={`font-semibold ${
                      getLastEvent(selectedEquipment) === "START" ? "text-green-600" :
                      getLastEvent(selectedEquipment) === "STOP" ? "text-amber-600" : "text-gray-400"
                    }`}>
                      {getLastEvent(selectedEquipment) || "Belum ada data"}
                    </span>
                  </div>
                )}
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="START"
                      checked={eventType === "START"}
                      onChange={() => setEventType("START")}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">START</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="STOP"
                      checked={eventType === "STOP"}
                      onChange={() => setEventType("STOP")}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">STOP</span>
                  </label>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal & Jam *</label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              {/* Shift */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift *</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                >
                  {SHIFT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {/* Reason (only for STOP) */}
              {eventType === "STOP" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Stop *</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                    placeholder="Contoh: Maintenance, Breakdown, No Material, dll"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus log?</h3>
            <p className="text-sm text-gray-500 mb-6">Log yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}