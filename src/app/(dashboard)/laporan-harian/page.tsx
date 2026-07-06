"use client";

import { useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import DataTable from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import ImageGallery from "@/components/ui/ImageGallery";

import Modal from "@/components/ui/Modal";
import SupervisorCutiDialog from "@/components/ui/SupervisorCutiDialog";
import { SwitchGear, SGStatus } from "@/types";
import { downloadPdf } from "@/lib/pdf";
import { isInRange, formatPeriod } from "@/lib/date";
import { Send, Edit3, Trash2, Loader2, Server } from "lucide-react";

const UNITS = ["Tonasa 2/3", "Tonasa 4", "Tonasa 5", "SG Lainnya"];


/** Ambil URL gambar dari field images (JSON) atau image (single) */
function getImages(item: SwitchGear): string[] {
  try {
    const parsed = JSON.parse(item.images || "[]");
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : item.image ? [item.image] : [];
  } catch {
    return item.image ? [item.image] : [];
  }
}

export default function LaporanHarianPage() {
  const { switchGears, updateSwitchGear, deleteSwitchGear, createApproval } = useData();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("Admin");
  const isSupervisor = hasRole("Supervisor");
  const isOperator = hasRole("Operator");
  const isVisitor = user?.role === "Visitor";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("Semua");
  const [searchText, setSearchText] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SwitchGear>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    table_name: string;
    record_id: number;
    action_type: "edit" | "delete" | "create";
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
  } | null>(null);
  const [showCutiDialog, setShowCutiDialog] = useState(false);

  const filteredSG = switchGears.filter((s) => isInRange(s.activeTime, startDate, endDate));
  const unitFilteredSG = selectedUnit === "Semua"
    ? filteredSG
    : filteredSG.filter((s) => s.unit === selectedUnit);

  const searchableKeys = ["name", "location", "unit", "status", "pic", "notifNo", "lototoNo", "requester", "activeTime", "finishTime", "description"];
  const pdfData = searchText
    ? unitFilteredSG.filter((s) =>
        searchableKeys.some((key) => {
          const val = (s as unknown as Record<string, unknown>)[key];
          return String(val).toLowerCase().includes(searchText.toLowerCase());
        })
      )
    : unitFilteredSG;

  const unitCounts = UNITS.map((u) => switchGears.filter((s) => s.unit === u).length);
  const unitVariants: Array<"blue" | "green" | "yellow" | "red"> = ["blue", "green", "yellow", "red"];

  const handleDownloadPdf = () => {
    const periodLabel = formatPeriod(startDate, endDate);

    const columns = ["Switch Gear", "Lokasi", "Unit", "Status", "PIC", "No. Notif", "No. Lototo", "Peminta", "Waktu Aktif", "Waktu Selesai", "Keterangan"];
    const rows = pdfData.map((s) => [
      s.name, s.location, s.unit, s.status, s.pic, s.notifNo, s.lototoNo, s.requester, s.activeTime, s.finishTime, s.description,
    ]);

    const statusIdx = columns.indexOf("Status");

    downloadPdf({
      title: "Laporan Monitoring Switch Gear",
      period: periodLabel,
      columns,
      rows,
      filename: `Laporan_Harian_${startDate || "all"}_${endDate || "all"}`,
      onCellParse: (data) => {
        if (data.section === "body" && data.row.raw) {
          const statusVal = String(data.row.raw[statusIdx]);
          if (statusVal === "Aktif Lototo") {
            data.cell.styles.textColor = [220, 38, 38]; // merah
          } else if (statusVal === "Maintenance") {
            data.cell.styles.textColor = [180, 83, 9]; // amber/kuning gelap
          }
          // Selesai tetap hitam (default)
        }
      },
    });
  };

  const sendWhatsApp = (s: SwitchGear) => {
    const now = new Date().toLocaleString("id-ID", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    const message = `*Laporan Lototo*
  _Seksi Pengaturan Beban_

  Switch Gear : _${s.name}_
  Lokasi : _${s.location}_
  Unit : _${s.unit}_
  Status : _${s.status}_
  PIC : _${s.pic}_
  No. Notif : _${s.notifNo || "-"}_
  No. Lototo : _${s.lototoNo || "-"}_
  Peminta : _${s.requester}_
  Waktu Aktif : _${s.activeTime}_
  Waktu Selesai : _${s.finishTime || "-"}_
  Keterangan : _${s.description || "-"}_

  _Source data From : https://distda-pocketnui.web.id_
  _Date Create : ${now}_
  _Dikirim oleh ${user?.name || "-"}_`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const openEdit = (sg: SwitchGear) => {
    setEditId(sg.id);
    setEditForm({ ...sg });
    setEditModal(true);
  };

  const handleDelete = (id: number) => {
    deleteSwitchGear(id);
    setConfirmDelete(null);
  };

  const handleCutiConfirm = (targetSupervisorId: number | null) => {
    if (pendingApproval) {
      createApproval({ ...pendingApproval, target_supervisor_id: targetSupervisorId } as any);
      alert("Permintaan perubahan telah dikirim ke Supervisor untuk disetujui.");
    }
    setShowCutiDialog(false);
    setPendingApproval(null);
  };

  const handleSave = async () => {
    if (!editId) return;

    // Operator perlu approval supervisor
    if (isOperator) {
      const oldItem = switchGears.find(s => s.id === editId);
      setPendingApproval({
        table_name: "switch_gears",
        record_id: editId,
        action_type: "edit",
        old_data: oldItem || null,
        new_data: editForm,
      });
      setShowCutiDialog(true);
      setEditModal(false);
      return;
    }

    // Admin atau Supervisor → langsung simpan
    setSaving(true);
    try {
      await updateSwitchGear(editId, editForm);
      setEditModal(false);
      setEditId(null);
    } catch (err) {
      console.error("update error:", err);
      alert("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "name", header: "Switch Gear", render: (s: SwitchGear) => <span className="font-semibold">{s.name}</span> },
    { key: "location", header: "Lokasi", render: (s: SwitchGear) => s.location },
    { key: "unit", header: "Unit", render: (s: SwitchGear) => s.unit },
    { key: "status", header: "Status", render: (s: SwitchGear) => <StatusBadge status={s.status} /> },
    { key: "pic", header: "PIC", render: (s: SwitchGear) => s.pic },
    { key: "notifNo", header: "No. Notif", render: (s: SwitchGear) => s.notifNo || "-" },
    { key: "lototoNo", header: "No. Lototo", render: (s: SwitchGear) => s.lototoNo || "-" },
    { key: "requester", header: "Peminta", render: (s: SwitchGear) => s.requester },
    { key: "activeTime", header: "Waktu Aktif", render: (s: SwitchGear) => s.activeTime, className: "text-gray-500" },
    { key: "finishTime", header: "Waktu Selesai", render: (s: SwitchGear) => s.finishTime || <span className="text-xs text-gray-300">—</span>, className: "text-gray-500" },
    { key: "image", header: "Gambar", render: (s: SwitchGear) => {
        const imgs = getImages(s);
        return imgs.length > 0 ? <ImageGallery images={imgs} /> : <span className="text-xs text-gray-300">—</span>;
      },
    },
    { key: "description", header: "Keterangan", render: (s: SwitchGear) => s.description || "-" },
    ...(!isVisitor ? [{
      key: "whatsapp" as const, header: "WhatsApp", render: (s: SwitchGear) => (
        <button onClick={() => sendWhatsApp(s)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Kirim via WhatsApp">
          <Send size={12} /> Kirim
        </button>
      ),
    }] : []),
    ...(isAdmin ? [{
      key: "actions" as const,
      header: "Aksi",
      render: (s: SwitchGear) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(s)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            title="Edit"
          >
            <Edit3 size={15} />
          </button>
          <button
            onClick={() => setConfirmDelete(s.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Hapus"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    }] : (isOperator || isSupervisor) ? [{
      key: "actions" as const,
      header: "Aksi",
      render: (s: SwitchGear) => (
        <div className="flex items-center gap-1">
          {s.status === "Selesai" && (
            <button
              onClick={() => openEdit(s)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              title="Edit"
            >
              <Edit3 size={15} />
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Lototo</h1>
        <p className="text-sm text-gray-500 mt-1">Laporan kegiatan maintenance dan LOTOTO.</p>
      </div>

      {/* Ringkasan per Unit */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {UNITS.map((u, i) => (
          <StatCard key={u} icon={Server} label={u} value={unitCounts[i]} variant={unitVariants[i]} />
        ))}
      </div>

      {/* Filter Tanggal */}
      <FilterBar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onDownloadPdf={handleDownloadPdf}
        showDownload={!isVisitor}
      />

      {/* Table */}
      <DataTable
        title={
          <div className="flex flex-col gap-2 w-full">
            <span className="text-sm sm:text-base font-semibold text-gray-900">Status Switch Gear</span>
            <div className="flex">
              {(["Semua", ...UNITS] as const).map((unit, idx, arr) => {
                const isActive = selectedUnit === unit;
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;
                const colors: Record<string, { active: string; inactive: string }> = {
                  "Semua":       { active: "bg-gray-600 text-white border-gray-600",      inactive: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200" },
                  "Tonasa 2/3":  { active: "bg-orange-600 text-white border-orange-600",  inactive: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
                  "Tonasa 4":    { active: "bg-purple-600 text-white border-purple-600",  inactive: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
                  "Tonasa 5":    { active: "bg-blue-600 text-white border-blue-600",      inactive: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
                  "SG Lainnya":  { active: "bg-red-600 text-white border-red-600",        inactive: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
                };
                const c = colors[unit];
                return (
                  <button
                    key={unit}
                    onClick={() => setSelectedUnit(unit)}
                    className={`relative px-3.5 py-1.5 text-xs font-medium border transition-all focus:outline-none ${
                      isFirst ? "rounded-l-lg" : isLast ? "rounded-r-lg" : "rounded-none"
                    } ${!isFirst ? "-ml-px" : ""} ${
                      isActive
                        ? `${c.active} z-10 shadow-sm`
                        : c.inactive
                    }`}
                  >
                    {unit}
                  </button>
                );
              })}
            </div>
          </div>
        }
        columns={columns}
        data={unitFilteredSG}
        searchPlaceholder="Cari switch gear..."
        onSearchChange={setSearchText}
        getRowClass={(s) => {
          if (s.status === "Aktif Lototo") return "hover:!bg-red-50";
          if (s.status === "Maintenance") return "hover:!bg-amber-50";
          return "";
        }}
      />

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Switch Gear"
        footer={
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Simpan
          </button>
        }
      >
        <div className="space-y-4">
          {!isAdmin && editId ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Switch Gear</label>
                  <p className="w-full px-3.5 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">{editForm.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Lokasi</label>
                  <p className="w-full px-3.5 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">{editForm.location}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                  <p className="w-full px-3.5 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">{editForm.unit}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <p className="w-full px-3.5 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">{editForm.status}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">PIC</label>
                <input type="text" value={editForm.pic || ""} onChange={(e) => setEditForm({ ...editForm, pic: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">No. Notifikasi</label>
                  <input type="text" value={editForm.notifNo || ""} onChange={(e) => setEditForm({ ...editForm, notifNo: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">No. Lototo</label>
                  <p className="w-full px-3.5 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">{editForm.lototoNo || "-"}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Peminta</label>
                <p className="w-full px-3.5 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">{editForm.requester}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Keterangan</label>
                <textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[70px]" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Switch Gear</label>
                  <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Lokasi</label>
                  <input type="text" value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                  <select value={editForm.unit || ""} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={editForm.status || ""} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SGStatus })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                    <option value="Aktif Lototo">Aktif Lototo</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">PIC</label>
                <input type="text" value={editForm.pic || ""} onChange={(e) => setEditForm({ ...editForm, pic: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">No. Notifikasi</label>
                  <input type="text" value={editForm.notifNo || ""} onChange={(e) => setEditForm({ ...editForm, notifNo: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">No. Lototo</label>
                  <input type="text" value={editForm.lototoNo || ""} onChange={(e) => setEditForm({ ...editForm, lototoNo: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Peminta</label>
                <input type="text" value={editForm.requester || ""} onChange={(e) => setEditForm({ ...editForm, requester: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Keterangan</label>
                <textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[70px]" />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus data?</h3>
            <p className="text-sm text-gray-500 mb-6">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Cuti Dialog */}
      <SupervisorCutiDialog
        open={showCutiDialog}
        onClose={() => { setShowCutiDialog(false); setPendingApproval(null); }}
        onConfirm={handleCutiConfirm}
      />
    </div>
  );
}
