"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
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
import { Plus, Edit3, Trash2, Loader2, Download, Calendar, CheckCircle, XCircle, FileSpreadsheet, Send } from "lucide-react";
import { logger } from "@/lib/logger";
import * as XLSX from "xlsx";
import SupervisorCutiDialog from "@/components/ui/SupervisorCutiDialog";

const SHIFT_OPTIONS = ["Dayshift", "Shift 1 (Pagi)", "Shift 2 (Siang)", "Shift 3 (Malam)"];

export default function EquipmentLogsPage() {
  const { user, hasRole } = useAuth();
  const { createApproval } = useData();
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
  const [eventType, setEventType] = useState<"START" | "STOP" | "HEATING_UP" | "">("");
  const [timestamp, setTimestamp] = useState(getCurrentDatetimeLocal());
  const [reason, setReason] = useState("");
  const [shift, setShift] = useState("Dayshift");
  const [updateBebanPln, setUpdateBebanPln] = useState("");
  const [updateBebanBtg, setUpdateBebanBtg] = useState("");
  const [main1Checked, setMain1Checked] = useState(false);
  const [main2Checked, setMain2Checked] = useState(false);
  const [main3Checked, setMain3Checked] = useState(false);
  const [posisiPower, setPosisiPower] = useState<"BTG" | "PLN" | "">("");
  const [confirmAction, setConfirmAction] = useState<Equipment | null>(null);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [equipmentName, setEquipmentName] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [equipmentLocked, setEquipmentLocked] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    table_name: string;
    record_id: number;
    action_type: "edit" | "delete" | "create";
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
  } | null>(null);
  const [showCutiDialog, setShowCutiDialog] = useState(false);

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

  // Check if equipment can START (last event must be STOP or HEATING_UP or no event)
  const canStartEquipment = (equipmentId: number): boolean => {
    const equipmentLogs = logs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (equipmentLogs.length === 0) return true;
    const lastEvent = equipmentLogs[0].event_type;
    return lastEvent === "STOP" || lastEvent === "HEATING_UP";
  };

  // Check if equipment can STOP (last event must be START or HEATING_UP)
  const canStopEquipment = (equipmentId: number): boolean => {
    const equipmentLogs = logs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (equipmentLogs.length === 0) return false;
    const lastEvent = equipmentLogs[0].event_type;
    return lastEvent === "START" || lastEvent === "HEATING_UP";
  };

  // Get last event for equipment
  const getLastEvent = (equipmentId: number): "START" | "STOP" | "HEATING_UP" | null => {
    const equipmentLogs = logs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return equipmentLogs.length > 0 ? equipmentLogs[0].event_type as "START" | "STOP" | "HEATING_UP" : null;
  };

  // Determine event type based on checked mains
  const getEventTypeFromChecklist = (availableMains: number = 3): "START" | "STOP" | "HEATING_UP" => {
    const checks = [main1Checked, main2Checked, main3Checked].filter(Boolean).length;
    if (checks === 0) return "STOP";
    if (checks === availableMains) return "START";
    return "HEATING_UP";
  };

  // Determine event type based on new checklist values (to handle async state updates)
  const getEventTypeFromChecklistForNewValue = (availableMains: number, newCount: number): "START" | "STOP" | "HEATING_UP" => {
    if (newCount === 0) return "STOP";
    if (newCount === availableMains) return "START";
    return "HEATING_UP";
  };


  // Initialize checklist from last event log
  const initializeChecklistFromLastEvent = (equipmentId: number) => {
    const equipmentLogs = logs
      .filter(log => log.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const lastLog = equipmentLogs[0];
    if (!lastLog) {
      setMain1Checked(false);
      setMain2Checked(false);
      setMain3Checked(false);
      return;
    }
    
    if (lastLog.event_type === "START") {
      setMain1Checked(true);
      setMain2Checked(true);
      setMain3Checked(true);
    } else if (lastLog.event_type === "STOP") {
      setMain1Checked(false);
      setMain2Checked(false);
      setMain3Checked(false);
    } else if (lastLog.event_type === "HEATING_UP") {
      setMain1Checked(!!lastLog.main1);
      setMain2Checked(!!lastLog.main2);
      setMain3Checked(!!lastLog.main3);
    }
    setPosisiPower((lastLog.posisi_power as "BTG" | "PLN" | "") || "");
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

    // Auto resolve event type from checklist
    const eqForSave = equipmentList.find(e => e.id === selectedEquipment);
    const availableMains = eqForSave ? [eqForSave.main1, eqForSave.main2, eqForSave.main3].filter(Boolean).length : 3;
    const resolvedEventType = getEventTypeFromChecklist(availableMains);
    setEventType(resolvedEventType);

    // Validasi (hanya untuk tambah log baru, bukan edit)
    if (!editing) {
      if (resolvedEventType === "START" && !canStartEquipment(selectedEquipment)) {
        alert("Equipment harus di-STOP terlebih dahulu sebelum di-START");
        return;
      }
      if (resolvedEventType === "STOP" && !canStopEquipment(selectedEquipment)) {
        alert("Equipment harus di-START terlebih dahulu sebelum di-STOP");
        return;
      }
      // HEATING_UP tidak memerlukan validasi, bisa langsung disimpan
    }
    setSaving(true);
    try {
      const payload = {
        equipment_id: selectedEquipment,
        event_type: resolvedEventType,
        timestamp: timestamp,
        reason: eventType === "STOP" ? reason.trim() : null,
        shift: shift,
        update_beban_pln: updateBebanPln ? parseFloat(updateBebanPln) : null,
        update_beban_btg: updateBebanBtg ? parseFloat(updateBebanBtg) : null,
        created_by: user?.name || "",
        posisi_power: posisiPower || null,
        main1: main1Checked ? (equipmentList.find(e => e.id === selectedEquipment)?.main1 || "") : null,
        main2: main2Checked ? (equipmentList.find(e => e.id === selectedEquipment)?.main2 || "") : null,
        main3: main3Checked ? (equipmentList.find(e => e.id === selectedEquipment)?.main3 || "") : null,
      };

      // Semua role langsung simpan untuk tambah/edit
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
    if (!isAdmin) {
      // Non-admin perlu approval untuk hapus
      const log = logs.find(l => l.id === id);
      if (log) {
        setPendingApproval({
          table_name: "equipment_logs",
          record_id: id,
          action_type: "delete",
          old_data: log,
          new_data: null,
        });
        setShowCutiDialog(true);
        setConfirmDelete(null);
        return;
      }
    }
    
    // Admin langsung hapus
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
    setEquipmentLocked(false);
    setEventType("");
    setTimestamp(getCurrentDatetimeLocal());
    setReason("");
    setShift("Dayshift");
    setUpdateBebanPln("");
    setUpdateBebanBtg("");
    setMain1Checked(false);
    setMain2Checked(false);
    setMain3Checked(false);
    setPosisiPower("");
    setEditing(null);
  };

  // Quick form handlers
  const resetQuickForm = () => {
    setSelectedEquipment("");
    setEquipmentName("");
    setEventType("");
    setTimestamp(getCurrentDatetimeLocal());
    setReason("");
    setShift("Dayshift");
    setUpdateBebanPln("");
    setUpdateBebanBtg("");
    setMain1Checked(false);
    setMain2Checked(false);
    setMain3Checked(false);
    setShowQuickForm(false);
  };

  const handleQuickSave = async () => {
    if (!selectedEquipment) {
      alert("Equipment tidak valid");
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

    const eq = equipmentList.find(e => e.id === selectedEquipment);
    if (eq) {
      setMain1Checked(!!eq.main1);
      setMain2Checked(!!eq.main2);
      setMain3Checked(!!eq.main3);
    }
    const availableMains = eq ? [eq.main1, eq.main2, eq.main3].filter(Boolean).length : 3;
    const resolvedEventType = getEventTypeFromChecklist(availableMains);
    setEventType(resolvedEventType);

    // Validasi
    if (resolvedEventType === "START" && !canStartEquipment(selectedEquipment)) {
      alert("Equipment harus di-STOP terlebih dahulu sebelum di-START");
      return;
    }
    if (resolvedEventType === "STOP" && !canStopEquipment(selectedEquipment)) {
      alert("Equipment harus di-START terlebih dahulu sebelum di-STOP");
      return;
    }
    // HEATING_UP tidak memerlukan validasi, bisa langsung disimpan
    setQuickSaving(true);
    try {
      const payload = {
        equipment_id: selectedEquipment,
        event_type: resolvedEventType,
        timestamp: timestamp,
        reason: eventType === "STOP" ? reason.trim() : null,
        shift: shift,
        update_beban_pln: updateBebanPln ? parseFloat(updateBebanPln) : null,
        update_beban_btg: updateBebanBtg ? parseFloat(updateBebanBtg) : null,
        created_by: user?.name || "",
        posisi_power: posisiPower || null,
        main1: main1Checked ? (equipmentList.find(e => e.id === selectedEquipment)?.main1 || "") : null,
        main2: main2Checked ? (equipmentList.find(e => e.id === selectedEquipment)?.main2 || "") : null,
        main3: main3Checked ? (equipmentList.find(e => e.id === selectedEquipment)?.main3 || "") : null,
      };

      // Semua role langsung simpan untuk quick form
      await createEquipmentLog(payload);

      resetQuickForm();
      fetchLogs();
    } catch (err) {
      logger.error('save log error', err);
      alert("Gagal menyimpan data: " + (err as any)?.message);
    } finally {
      setQuickSaving(false);
    }
  };

  // Handle approval dialog confirmation
  const handleCutiConfirm = (targetSupervisorId: number | null) => {
    if (pendingApproval) {
      createApproval({ ...pendingApproval, target_supervisor_id: targetSupervisorId } as any);
      const msg =
        pendingApproval.action_type === "delete"
          ? "Permintaan penghapusan telah dikirim ke Supervisor untuk disetujui."
          : pendingApproval.action_type === "edit"
          ? "Permintaan perubahan telah dikirim ke Supervisor untuk disetujui."
          : "Permintaan penambahan telah dikirim ke Supervisor untuk disetujui.";

      alert(msg);
    }
    setShowCutiDialog(false);
    setPendingApproval(null);
    // Reset form after approval submitted
    if (showForm) {
      setShowForm(false);
      setEditing(null);
      resetForm();
    }
    if (showQuickForm) {
      resetQuickForm();
    }
  };

  // Open edit form
  const openEdit = (log: EquipmentLogWithDetails) => {
    setEditing(log);
    setSelectedEquipment(log.equipment_id);
    setEquipmentLocked(true);
    setTimestamp(toDatetimeLocal(log.timestamp) || getCurrentDatetimeLocal());
    setReason(log.reason || "");
    setShift(log.shift || "Dayshift");
    setUpdateBebanPln(log.update_beban_pln?.toString() || "");
    setUpdateBebanBtg(log.update_beban_btg?.toString() || "");
    setPosisiPower((log.posisi_power as "BTG" | "PLN" | "") || "");
    // Set event type directly from log
    setEventType(log.event_type);
    // Initialize checklist from log's main values
    setMain1Checked(!!log.main1);
    setMain2Checked(!!log.main2);
    setMain3Checked(!!log.main3);
    setShowForm(true);
  };

  // Open add form
  const openAdd = () => {
    setEditing(null);
    setEquipmentLocked(false);
    resetForm();
    setShowForm(true);
  };

  // Open confirm dialog from card click
  const openConfirmDialog = (eq: Equipment) => {
    setConfirmAction(eq);
  };

  // Handle confirm action (Yes/No)
  const handleConfirmAction = (confirmed: boolean) => {
    if (confirmed && confirmAction) {
      setSelectedEquipment(confirmAction.id);
      setEquipmentName(`${confirmAction.name} (${confirmAction.unit})`);
      
      // Initialize checklist and auto-detect event type from last event
      const eq = equipmentList.find(e => e.id === confirmAction.id);
      if (eq) {
        const equipmentLogs = logs
          .filter(log => log.equipment_id === confirmAction.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const lastLog = equipmentLogs[0];
        let initialMain1 = false, initialMain2 = false, initialMain3 = false;
        
        if (lastLog) {
          if (lastLog.event_type === "START") {
            initialMain1 = !!eq.main1;
            initialMain2 = !!eq.main2;
            initialMain3 = !!eq.main3;
            setEventType("START");
          } else if (lastLog.event_type === "STOP") {
            setEventType("STOP");
          } else if (lastLog.event_type === "HEATING_UP") {
            initialMain1 = !!lastLog.main1;
            initialMain2 = !!lastLog.main2;
            initialMain3 = !!lastLog.main3;
            setEventType("HEATING_UP");
          }
        } else {
          // No previous log, default to STOP
          setEventType("STOP");
        }
        
        setMain1Checked(initialMain1);
        setMain2Checked(initialMain2);
        setMain3Checked(initialMain3);
        setPosisiPower((lastLog?.posisi_power as "BTG" | "PLN" | "") || "");
      }
      
      setShowQuickForm(true);
    }
    setConfirmAction(null);
  };

  // Download PDF
  const handleDownloadPdf = () => {
    const columns = ["Tanggal Jam", "Equipment", "Unit", "Event", "Shift", "Keterangan"];
    const rows = filteredLogs.map(log => [
      toIndonesianDate(log.timestamp),
      log.equipment_name,
      log.unit,
      log.event_type,
      log.shift || "-",
      log.reason || "-",
    ]);

    downloadPdf({
      title: "Laporan Start-Stop Equipment",
      period: formatPeriod(startDate, endDate),
      columns,
      rows,
      filename: `Laporan_StartStop_${startDate || "all"}_${endDate || "all"}`,
    });
  };

  // Download Excel
  const handleDownloadExcel = () => {
    const rows = filteredLogs.map(log => ({
      "Tanggal Jam": toIndonesianDate(log.timestamp),
      "Equipment": log.equipment_name,
      "Unit": log.unit,
      "Posisi Power": log.posisi_power || "-",
      "Event": log.event_type,
      "Shift": log.shift || "-",
      "Keterangan": log.reason || "-",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Start-Stop Equipment");
    
    const filename = `Laporan_StartStop_${startDate || "all"}_${endDate || "all"}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // WhatsApp share
  const sendWhatsApp = (log: EquipmentLogWithDetails) => {
    const now = new Date().toLocaleString("id-ID", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

    const eventIcon = log.event_type === "START" ? "►" : log.event_type === "HEATING_UP" ? "◐" : "■";

    let bebanText = "";
    if (log.update_beban_pln != null || log.update_beban_btg != null) {
      bebanText = `*Update Beban :*
`;
      if (log.update_beban_pln != null) bebanText += `*- PLN :* _${log.update_beban_pln.toFixed(1)} MW_\n`;
      if (log.update_beban_btg != null) bebanText += `*- BTG :* _${log.update_beban_btg.toFixed(1)} MW_\n`;
    }

    const mains = [log.main1, log.main2, log.main3].filter(Boolean);
    const mainsText = mains.length > 0 ? mains.join(", ") : "-";
    const message = `--------------------------------\n*Laporan Start-Stop Peralatan*\n_Seksi Pengaturan Beban_\n--------------------------------\n\n*Equipment :* _${log.equipment_name}_\n*Start :* _${mainsText}_\n*Unit :* _${log.unit}_\n*Event :* ${eventIcon} _${log.event_type === "HEATING_UP" ? "HEATING UP" : log.event_type}_\n*Tanggal :* _${toIndonesianDate(log.timestamp)}_\n*Shift :* _${log.shift || "-"}_\n${bebanText}*Keterangan :* _${log.reason || "-"}_\n\n--------------------------------\n_Date Create : ${now}_\n_Send by *${user?.name || "-"}*\n--------------------------------\n_Source : https://distda-pocketnui.biz.id_\n--------------------------------`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
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
            : log.event_type === "HEATING_UP"
            ? "bg-orange-100 text-orange-700"
            : "bg-red-100 text-red-700"
        }`}>
          {log.event_type === "START" ? <CheckCircle size={12} /> : log.event_type === "HEATING_UP" ? <Loader2 size={12} /> : <XCircle size={12} />}
          {log.event_type === "HEATING_UP" ? "HEATING UP" : log.event_type}
        </span>
      )
    },
    { key: "posisi_power", header: "Posisi Power", render: (log: EquipmentLogWithDetails) => log.posisi_power || "-" },
    {
      key: "update_beban_pln",
      header: "Update PLN (MW)",
      render: (log: EquipmentLogWithDetails) => log.update_beban_pln != null ? `${log.update_beban_pln.toFixed(1)} MW` : "-",
    },
    {
      key: "update_beban_btg",
      header: "Update BTG (MW)",
      render: (log: EquipmentLogWithDetails) => log.update_beban_btg != null ? `${log.update_beban_btg.toFixed(1)} MW` : "-",
    },
    { key: "reason", header: "Alasan", render: (log: EquipmentLogWithDetails) => log.reason || "-" },
    { key: "shift", header: "Shift", render: (log: EquipmentLogWithDetails) => log.shift || "-" },
    { key: "created_by", header: "Dibuat Oleh", render: (log: EquipmentLogWithDetails) => log.created_by },
    {
      key: "whatsapp" as const,
      header: "Kirim WA",
      render: (log: EquipmentLogWithDetails) => (
        <button
          onClick={() => sendWhatsApp(log)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
          title="Kirim via WhatsApp"
        >
          <Send size={12} />
          Kirim
        </button>
      ),
    },
    ...(isAdmin ? [{
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
        <h1 className="text-2xl font-bold text-gray-900">Daftar Peralatan Pabrik (Start-Stop)</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoring start-stop operasional peralatan</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-2">
          {/* Date filter */}
          <div className="col-span-1 lg:col-span-2 flex items-center gap-2">
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
          
          {/* Unit filter */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="col-span-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="Semua">Semua Unit</option>
            {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
          
          {/* Equipment filter */}
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value ? Number(e.target.value) : "")}
            className="col-span-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua Equipment</option>
            {equipmentList
              .filter(eq => selectedUnit === "Semua" || eq.unit === selectedUnit)
              .map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name} ({eq.unit})</option>
              ))}
          </select>
          
          {/* Download buttons */}
          <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={14} />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Equipment per Unit */}
      <div className="space-y-6">
        {units.map(unit => {
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
                <h2 className="text-lg font-bold text-gray-900">{unit}</h2>
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
                  const equipmentLogs = logs.filter(log => log.equipment_id === eq.id);
                  const lastLog = equipmentLogs.length > 0 ? equipmentLogs[0] : null;
                  const posisiPower = lastLog?.posisi_power || null;
                  
                  return (
                    <div 
                      key={eq.id} 
                      className={`rounded-xl shadow-sm border px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow ${cardBg}`}
                      onClick={() => openConfirmDialog(eq)}
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
                          {[eq.main1, eq.main2, eq.main3].filter(Boolean).join(", ")}
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
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">{editing ? "Edit Log" : "Tambah Log Start-Stop"}</h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment *</label>
                {equipmentLocked && selectedEquipment ? (
                  <>
                    <div className="w-full px-3.5 py-2.5 border-2 border-gray-300 rounded-xl bg-gray-100 text-sm text-gray-600 flex items-center justify-between cursor-not-allowed">
                      <span>{equipmentList.find(eq => eq.id === selectedEquipment)?.name} ({equipmentList.find(eq => eq.id === selectedEquipment)?.unit})</span>
                      <span className="text-gray-400 text-xs ml-2">Locked</span>
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Status terakhir: </span>
                      <span className={`font-semibold ${
                        getLastEvent(selectedEquipment) === "START" ? "text-green-600" :
                        getLastEvent(selectedEquipment) === "STOP" ? "text-amber-600" : "text-gray-400"
                      }`}>
                        {getLastEvent(selectedEquipment) || "Belum ada data"}
                      </span>
                    </div>
                  </>
                ) : (
                  <select
                    value={selectedEquipment}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setSelectedEquipment(val);
                      const eq = equipmentList.find(e => e.id === val);
                      setMain1Checked(!!eq?.main1);
                      setMain2Checked(!!eq?.main2);
                      setMain3Checked(!!eq?.main3);
                    }}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="">Pilih Equipment</option>
                    {equipmentList.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.unit})
                      </option>
                    ))}
                  </select>
                )}

                {/* Main Checklist */}
                {selectedEquipment && (() => {
                  const eq = equipmentList.find(e => e.id === selectedEquipment);
                  if (!eq) return null;
                  const checks = [
                    { key: "main1", label: eq.main1, checked: main1Checked, setter: setMain1Checked },
                    { key: "main2", label: eq.main2, checked: main2Checked, setter: setMain2Checked },
                    { key: "main3", label: eq.main3, checked: main3Checked, setter: setMain3Checked },
                  ].filter(c => c.label && c.label.trim() !== "");
                  if (checks.length === 0) return null;
                  return (
                    <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Checklist Main</p>
                      <div className="flex flex-wrap gap-3">
                        {eq.main1 && (
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={main1Checked}
                              disabled={!!editing}
                              onChange={(e) => {
                                const newVal = e.target.checked;
                                setMain1Checked(newVal);
                                if (!newVal) {
                                  setMain2Checked(false);
                                  setMain3Checked(false);
                                }
                                const newCount = (newVal ? 1 : 0) + (main2Checked ? 1 : 0) + (main3Checked ? 1 : 0);
                                setEventType(getEventTypeFromChecklistForNewValue(checks.length, newCount));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {eq.main1}
                          </label>
                        )}
                        {eq.main2 && (
                          <label className={`flex items-center gap-2 text-sm ${main1Checked ? 'text-gray-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}>
                            <input
                              type="checkbox"
                              checked={main2Checked}
                              disabled={!!editing || !main1Checked || !eq.main1}
                              onChange={(e) => {
                                const newVal = e.target.checked;
                                setMain2Checked(newVal);
                                if (!newVal) {
                                  setMain3Checked(false);
                                }
                                const newCount = (main1Checked ? 1 : 0) + (newVal ? 1 : 0) + (newVal ? (main3Checked ? 1 : 0) : 0);
                                setEventType(getEventTypeFromChecklistForNewValue(checks.length, newCount));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {eq.main2}
                          </label>
                        )}
                        {eq.main3 && (
                          <label className={`flex items-center gap-2 text-sm ${main1Checked && main2Checked ? 'text-gray-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}>
                            <input
                              type="checkbox"
                              checked={main3Checked}
                              disabled={!!editing || !(main1Checked && main2Checked) || !eq.main1 || !eq.main2}
                              onChange={(e) => {
                                const newVal = e.target.checked;
                                setMain3Checked(newVal);
                                const newCount = (main1Checked ? 1 : 0) + (main2Checked ? 1 : 0) + (newVal ? 1 : 0);
                                setEventType(getEventTypeFromChecklistForNewValue(checks.length, newCount));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {eq.main3}
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Event Type */}


              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <div className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm flex items-center gap-2">
                  {eventType === "START" && <CheckCircle size={16} className="text-green-600" />}
                  {eventType === "HEATING_UP" && <Loader2 size={16} className="text-orange-600 animate-spin" />}
                  {eventType === "STOP" && <XCircle size={16} className="text-red-600" />}
                  <span className="font-medium">{eventType || "-"}</span>
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

              {/* Posisi Power */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posisi Power</label>
                <select
                  value={posisiPower}
                  onChange={(e) => setPosisiPower(e.target.value as "BTG" | "PLN" | "")}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                >
                  <option value="">Pilih Posisi Power</option>
                  <option value="BTG">BTG</option>
                  <option value="PLN">PLN</option>
                </select>
              </div>

              {/* Update Beban PLN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Beban PLN (MW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={updateBebanPln}
                  onChange={(e) => setUpdateBebanPln(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="0.0"
                />
              </div>

              {/* Update Beban BTG */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Beban BTG (MW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={updateBebanBtg}
                  onChange={(e) => setUpdateBebanBtg(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="0.0"
                />
              </div>

              {/* Created By (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dibuat Oleh</label>
                <input
                  type="text"
                  value={user?.name || ""}
                  readOnly
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-500 outline-none cursor-not-allowed"
                />
              </div>

              {/* Reason (only for STOP) */}
              {eventType === "STOP" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Stop *</label>
                  <textarea
                    value={reason}
                    disabled={!!editing}
                    rows={3}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                    placeholder="Contoh: Maintenance, Breakdown, No Material, dll"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
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

      {/* Confirm Action Dialog (from card click) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Update Data?</h3>
            <p className="text-sm text-gray-500 mb-2">Equipment: <span className="font-semibold text-gray-900">{confirmAction.name}</span></p>
            <p className="text-sm text-gray-500 mb-6">Apakah Anda ingin menambahkan data start-stop untuk equipment ini?</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => handleConfirmAction(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Tidak</button>
              <button onClick={() => handleConfirmAction(true)} className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">Ya</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Form Modal (from card click) */}
      {showQuickForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowQuickForm(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Tambah Log Start-Stop</h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Equipment (Readonly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
                <div className="w-full px-3.5 py-2.5 border-2 border-gray-300 rounded-xl bg-gray-100 text-sm text-gray-600 flex items-center justify-between cursor-not-allowed">
                  <span>{equipmentName}</span>
                  <span className="text-gray-400 text-xs ml-2">Locked</span>
                </div>
                {selectedEquipment && (() => {
                  const eq = equipmentList.find(e => e.id === selectedEquipment);
                  if (!eq) return null;
                  const checks = [
                    { key: "main1", label: eq.main1, checked: main1Checked, setter: setMain1Checked },
                    { key: "main2", label: eq.main2, checked: main2Checked, setter: setMain2Checked },
                    { key: "main3", label: eq.main3, checked: main3Checked, setter: setMain3Checked },
                  ].filter(c => c.label && c.label.trim() !== "");
                  if (checks.length === 0) return null;
                  return (
                    <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Checklist Main</p>
                      <div className="flex flex-wrap gap-3">
                        {eq.main1 && (
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={main1Checked}
                              onChange={(e) => {
                                const newVal = e.target.checked;
                                setMain1Checked(newVal);
                                if (!newVal) {
                                  setMain2Checked(false);
                                  setMain3Checked(false);
                                }
                                const newCount = (newVal ? 1 : 0) + (main2Checked ? 1 : 0) + (main3Checked ? 1 : 0);
                                setEventType(getEventTypeFromChecklistForNewValue(checks.length, newCount));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {eq.main1}
                          </label>
                        )}
                        {eq.main2 && (
                          <label className={`flex items-center gap-2 text-sm ${main1Checked ? 'text-gray-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}>
                            <input
                              type="checkbox"
                              checked={main2Checked}
                              disabled={!!editing || !main1Checked || !eq.main1}
                              onChange={(e) => {
                                const newVal = e.target.checked;
                                setMain2Checked(newVal);
                                if (!newVal) {
                                  setMain3Checked(false);
                                }
                                const newCount = (main1Checked ? 1 : 0) + (newVal ? 1 : 0) + (newVal ? (main3Checked ? 1 : 0) : 0);
                                setEventType(getEventTypeFromChecklistForNewValue(checks.length, newCount));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {eq.main2}
                          </label>
                        )}
                        {eq.main3 && (
                          <label className={`flex items-center gap-2 text-sm ${main1Checked && main2Checked ? 'text-gray-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}>
                            <input
                              type="checkbox"
                              checked={main3Checked}
                              disabled={!!editing || !(main1Checked && main2Checked) || !eq.main1 || !eq.main2}
                              onChange={(e) => {
                                const newVal = e.target.checked;
                                setMain3Checked(newVal);
                                const newCount = (main1Checked ? 1 : 0) + (main2Checked ? 1 : 0) + (newVal ? 1 : 0);
                                setEventType(getEventTypeFromChecklistForNewValue(checks.length, newCount));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {eq.main3}
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <div className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm flex items-center gap-2">
                  {eventType === "START" && <CheckCircle size={16} className="text-green-600" />}
                  {eventType === "HEATING_UP" && <Loader2 size={16} className="text-orange-600 animate-spin" />}
                  {eventType === "STOP" && <XCircle size={16} className="text-red-600" />}
                  <span className="font-medium">{eventType || "-"}</span>
                </div>
                {selectedEquipment && (
                  <div className="mt-2 text-xs text-gray-500">
                    {getLastEvent(selectedEquipment) === "START" ? "Equipment sedang running, hanya bisa STOP" :
                     getLastEvent(selectedEquipment) === "STOP" ? "Equipment sedang stopped, hanya bisa START" :
                     "Silakan pilih event type"}
                  </div>
                )}
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

              {/* Posisi Power */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posisi Power</label>
                <select
                  value={posisiPower}
                  onChange={(e) => setPosisiPower(e.target.value as "BTG" | "PLN" | "")}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                >
                  <option value="">Pilih Posisi Power</option>
                  <option value="BTG">BTG</option>
                  <option value="PLN">PLN</option>
                </select>
              </div>

              {/* Update Beban PLN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Beban PLN (MW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={updateBebanPln}
                  onChange={(e) => setUpdateBebanPln(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="0.0"
                />
              </div>

              {/* Update Beban BTG */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Beban BTG (MW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={updateBebanBtg}
                  onChange={(e) => setUpdateBebanBtg(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="0.0"
                />
              </div>

              {/* Created By (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dibuat Oleh</label>
                <input
                  type="text"
                  value={user?.name || ""}
                  readOnly
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-500 outline-none cursor-not-allowed"
                />
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
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={resetQuickForm}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleQuickSave}
                disabled={quickSaving}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {quickSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      {showCutiDialog && pendingApproval && (
        <SupervisorCutiDialog
          open={showCutiDialog}
          onClose={() => {
            setShowCutiDialog(false);
            setPendingApproval(null);
          }}
          onConfirm={handleCutiConfirm}
        />
      )}
    </div>
  );
}