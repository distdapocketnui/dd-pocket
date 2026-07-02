"use client";

import { useState, useRef, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar from "@/components/ui/FilterBar";
import { SwitchGear, SGStatus } from "@/types";
import { Layers, CheckCircle, Wrench, CheckCheck, Lock, Image as ImageIcon, ListOrdered, X, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/image";
import { downloadPdf } from "@/lib/pdf";
import { isInRange, formatPeriod, toIndonesianDate, toDatetimeLocal, getCurrentDatetimeLocal } from "@/lib/date";
import { initGoogleDrive, uploadToGoogleDrive } from "@/lib/google-drive";

export default function LototoPage() {
  const { switchGears, addSwitchGear, updateSwitchGear, deleteSwitchGear, createApproval } = useData();
  const { user, hasRole } = useAuth();
  const isOperator = user?.role === "Operator" || user?.role === "Supervisor";
  const isDayshiftOperator = user?.role === "Operator" && user?.regu === "Dayshift";
  const isVisitor = user?.role === "Visitor";
  const canEdit = hasRole("Admin", "Supervisor") || (hasRole("Operator") && !isDayshiftOperator);
  const canDirect = hasRole("Admin");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init Google Drive
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId) initGoogleDrive(clientId);
  }, []);
  const [form, setForm] = useState<{
    name: string; location: string; unit: string; status: SGStatus;
    pic: string; requester: string; notifNo: string; lototoNo: string;
    description: string; image: string;
    activeTime: string; finishTime: string;
  }>({
    name: "", location: "", unit: "Tonasa 2/3", status: "Aktif Lototo",
    pic: "", requester: "", notifNo: "", lototoNo: "", description: "", image: "",
    activeTime: "", finishTime: "",
  });

  const aktif = switchGears.filter((s) => s.status === "Aktif Lototo").length;
  const maintenance = switchGears.filter((s) => s.status === "Maintenance").length;
  const selesai = switchGears.filter((s) => s.status === "Selesai").length;
  const lototoSG = switchGears.filter((s) => s.status === "Aktif Lototo");
  const filteredSG = lototoSG.filter((s) => isInRange(s.activeTime, startDate, endDate));

  const handleDownloadPdf = () => {
    const pdfColumns = ["Switch Gear", "Lokasi", "Unit", "Status", "PIC", "No. Notif", "No. Lototo", "Peminta", "Waktu Aktif", "Waktu Selesai", "Keterangan"];
    const rows = filteredSG.map((s) => [
      s.name, s.location, s.unit, s.status, s.pic, s.notifNo, s.lototoNo, s.requester, s.activeTime, s.finishTime, s.description,
    ]);
    downloadPdf({
      title: "Laporan Monitoring Switch Gear",
      period: formatPeriod(startDate, endDate),
      columns: pdfColumns,
      rows,
      filename: `Laporan_SG_${startDate || "awal"}_${endDate || "akhir"}`,
    });
  };

  const openAdd = () => {
    setEditId(null);
    setImagePreview("");
    setForm({
      name: "", location: "", unit: "Tonasa 2/3", status: "Aktif Lototo",
      pic: "", requester: "", notifNo: "", lototoNo: "", description: "", image: "",
      activeTime: getCurrentDatetimeLocal(), finishTime: "",
    });
    setModalOpen(true);
  };

  const openEdit = (sg: SwitchGear) => {
    setEditId(sg.id);
    setImagePreview(sg.image || "");
    setForm({
      name: sg.name, location: sg.location, unit: sg.unit, status: sg.status,
      pic: sg.pic, requester: sg.requester, notifNo: sg.notifNo, lototoNo: sg.lototoNo,
      description: sg.description, image: sg.image || "",
      activeTime: toDatetimeLocal(sg.activeTime) || getCurrentDatetimeLocal(),
      finishTime: toDatetimeLocal(sg.finishTime) || getCurrentDatetimeLocal(),
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);
    try {
      const compressed = await compressImage(file);
      setForm(prev => ({ ...prev, image: compressed }));
      setImagePreview(compressed);
    } catch {
      alert("Gagal memproses gambar");
    }
    setImageLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = () => {
    setForm(prev => ({ ...prev, image: "" }));
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (sg: SwitchGear) => {
    if (confirm("Yakin ingin menghapus switch gear ini?")) {
      if (isOperator) {
        createApproval({
          table_name: "switch_gears",
          record_id: sg.id,
          action_type: "delete",
          old_data: sg,
          new_data: null,
        });
        alert("Permintaan penghapusan telah dikirim ke Admin/Supervisor untuk disetujui.");
      } else {
        deleteSwitchGear(sg.id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      activeTime: toIndonesianDate(form.activeTime) || form.activeTime,
      finishTime: toIndonesianDate(form.finishTime) || form.finishTime,
    };

    // Upload gambar baru (base64) ke Google Drive
    if (payload.image && payload.image.startsWith("data:")) {
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        alert("GOOGLE_CLIENT_ID belum diatur di .env.local");
        return;
      }
      setUploadingDrive(true);
      try {
        const ts = Date.now();
        const name = `SG_${payload.name || "unknown"}_${ts}`;
        payload.image = await uploadToGoogleDrive(payload.image, name);
      } catch (err: any) {
        alert("Gagal upload gambar ke Google Drive: " + (err.message || err));
        setUploadingDrive(false);
        return;
      }
      setUploadingDrive(false);
    }

    if (editId) {
      if (isOperator) {
        const oldItem = switchGears.find(s => s.id === editId);
        createApproval({
          table_name: "switch_gears",
          record_id: editId,
          action_type: "edit",
          old_data: oldItem || null,
          new_data: payload,
        });
        alert("Permintaan perubahan telah dikirim ke Admin/Supervisor untuk disetujui.");
      } else {
        updateSwitchGear(editId, payload);
      }
    } else {
        if (isOperator) {
          createApproval({
            table_name: "switch_gears",
            record_id: 0,
            action_type: "create",
            old_data: null,
            new_data: payload,
          });
          alert("Permintaan penambahan telah dikirim ke Admin/Supervisor untuk disetujui.");
        } else {
          addSwitchGear(payload);
        }
      }
    setModalOpen(false);
  };

  const getDrivePreviewUrl = (url: string) => {
    // Ekstrak file ID dari berbagai format URL Google Drive
    const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
    const fileId = match?.[1];
    return fileId
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : null;
  };

  const handleImageClick = (sg: SwitchGear) => {
    if (!sg.image) return;
    if (sg.image.includes("drive.google.com")) {
      const previewUrl = getDrivePreviewUrl(sg.image);
      if (previewUrl) setLightboxImg(previewUrl);
    } else {
      setLightboxImg(sg.image);
    }
  };

  const columns = [
    { key: "name", header: "Switch Gear", render: (s: SwitchGear) => <span className="font-semibold">{s.name}</span> },
    { key: "location", header: "Lokasi", render: (s: SwitchGear) => s.location },
    { key: "unit", header: "Unit", render: (s: SwitchGear) => s.unit },
    { key: "status", header: "Status", render: (s: SwitchGear) => <StatusBadge status={s.status} /> },
    { key: "pic", header: "PIC", render: (s: SwitchGear) => s.pic },
    { key: "notifNo", header: "No. Notif", render: (s: SwitchGear) => s.notifNo },
    { key: "lototoNo", header: "No. Lototo", render: (s: SwitchGear) => s.lototoNo },
    { key: "requester", header: "Peminta", render: (s: SwitchGear) => s.requester },
    { key: "activeTime", header: "Waktu Aktif", render: (s: SwitchGear) => s.activeTime || <span className="text-xs text-gray-300">—</span>, className: "text-gray-500" },
    { key: "finishTime", header: "Waktu Selesai", render: (s: SwitchGear) => s.finishTime || <span className="text-xs text-gray-300">—</span>, className: "text-gray-500" },
    {
      key: "image", header: "Gambar", render: (s: SwitchGear) => s.image ? (
        <button onClick={() => handleImageClick(s)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors">
          <ImageIcon size={12} /> Lihat
        </button>
      ) : (
        <span className="text-xs text-gray-300">—</span>
      ),
    },
    { key: "description", header: "Keterangan", render: (s: SwitchGear) => (
      <span className="truncate max-w-[150px] block" title={s.description}>{s.description}</span>
    ) },
    ...(canEdit ? [{
      key: "actions" as const, header: "Action", render: (s: SwitchGear) => (
        <div className="flex gap-1.5">
          <button onClick={() => openEdit(s)} className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-colors ${isOperator ? "bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"}`} title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => handleDelete(s)} className="w-7 h-7 rounded flex items-center justify-center text-xs bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors" title="Hapus">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring LOTOTO Aktif</h1>
        <p className="text-sm text-gray-500 mt-1">Daftar switch gear yang saat ini dalam status pengamanan LOTOTO.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Total Pekerjaan" value={switchGears.length} variant="blue" />
        <StatCard icon={CheckCircle} label="Lototo Aktif" value={aktif} variant="green" href="/lototo" />
        <StatCard icon={Wrench} label="SG Maintenance" value={maintenance} variant="yellow" href="/sg-maintenance" />
        <StatCard icon={CheckCheck} label="SG Selesai" value={selesai} variant="red" />
      </div>

      <FilterBar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onDownloadPdf={handleDownloadPdf}
        showDownload={!isVisitor}
      />

      {/* DataTable */}
      <DataTable
        title={<span className="flex items-center gap-2"><Lock size={16} className="text-blue-600" /> Daftar LOTOTO Aktif</span> as unknown as string}
        columns={columns}
        data={filteredSG}
        searchPlaceholder="Cari..."
        actions={
          canEdit ? (
            <button onClick={openAdd} className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah
            </button>
          ) : undefined
        }
      />

      {/* LOTOTO Procedure */}
      <div className="bg-white rounded-xl p-5 lg:p-6 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-5">
          <ListOrdered size={18} className="text-blue-600" />
          Prosedur LOTOTO
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { num: 1, title: "Identifikasi Sumber Energi", desc: "Identifikasi semua sumber energi yang perlu diamankan" },
            { num: 2, title: "Lockout / Tagout", desc: "Pasang gembok dan tag pada switch gear yang diamankan" },
            { num: 3, title: "Verifikasi Nol Energi", desc: "Verifikasi bahwa semua energi telah diamankan (zero energy)" },
            { num: 4, title: "Mulai Pekerjaan", desc: "Pekerjaan maintenance dapat dimulai setelah verifikasi" },
            { num: 5, title: "Selesaikan & Lepas", desc: "Selesaikan pekerjaan, lepas gembok/tag, dan nyalakan kembali" },
            { num: 6, title: "Dokumentasi", desc: "Catat dan dokumentasikan seluruh proses LOTOTO" },
          ].map((step) => (
            <div key={step.num} className="flex gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border-l-[3px] border-blue-500 hover:bg-blue-50 transition-all duration-200">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 mt-0.5">
                {step.num}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-800">{step.title}</h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Switch Gear" : "Tambah Switch Gear"}
        footer={<button type="submit" form="sgForm" disabled={uploadingDrive} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
          {uploadingDrive ? <Loader2 size={14} className="animate-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
          {uploadingDrive ? "Mengupload..." : "Simpan"}
        </button>}
      >
        <form id="sgForm" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Switch Gear</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="SG-MV-01" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Lokasi</label>
              <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Area Transformer" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                <option>Tonasa 2/3</option><option>Tonasa 4</option><option>Tonasa 5</option><option>SG Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "Aktif Lototo" | "Maintenance" | "Selesai" })} className={`w-full px-3.5 py-2.5 border-2 rounded-xl text-sm focus:bg-white focus:ring-4 outline-none transition-all ${
                form.status === "Aktif Lototo" ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20" :
                form.status === "Maintenance" ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/20" :
                form.status === "Selesai" ? "border-emerald-400 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-500/20" :
                "border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500/10"
              }`}>
                <option value="Aktif Lototo">Aktif Lototo</option><option value="Maintenance">Maintenance</option><option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>

          {/* Waktu Aktif */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Waktu Aktif</label>
            <input
              type="datetime-local"
              required
              value={form.activeTime}
              onChange={(e) => setForm({ ...form, activeTime: e.target.value })}
              className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>

          {/* Waktu Selesai (muncul saat status = Selesai) */}
          {form.status === "Selesai" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Waktu Selesai</label>
              <input
                type="datetime-local"
                required
                value={form.finishTime}
                onChange={(e) => setForm({ ...form, finishTime: e.target.value })}
                className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">PIC</label>
              <input type="text" required value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Nama PIC" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Peminta</label>
              <input type="text" required value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Nama peminta" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">No. Notifikasi</label>
              <input type="text" value={form.notifNo} onChange={(e) => setForm({ ...form, notifNo: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="NOTIF-2026-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">No. Lototo</label>
              <input type="text" value={form.lototoNo} onChange={(e) => setForm({ ...form, lototoNo: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="LT-2026-001" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Keterangan</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[70px]" placeholder="Deskripsi pekerjaan..." />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Gambar</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer"
              />
              {imageLoading && (
                <svg className="animate-spin h-5 w-5 text-blue-600 flex-shrink-0" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            {imagePreview && (
              <div className="relative mt-3 inline-block">
                <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded-xl border border-gray-200 object-cover" />
                <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors" title="Hapus gambar">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            {lightboxImg.includes("/preview") ? (
              <iframe
                src={lightboxImg}
                className="w-full h-[80vh] rounded-xl shadow-2xl"
                allow="autoplay"
              />
            ) : (
              <img src={lightboxImg} alt="Gambar" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl mx-auto" />
            )}
            <button onClick={() => setLightboxImg(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
