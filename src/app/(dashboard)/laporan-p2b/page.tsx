"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import DataTable from "@/components/ui/DataTable";
import { downloadPdf } from "@/lib/pdf";
import { isInRange, formatPeriod, toIndonesianDate } from "@/lib/date";
import { Plus, Edit3, Trash2, Loader2, Send, Calendar, Download, User, Activity, BarChart3 } from "lucide-react";
import LineChart from "@/components/ui/LineChart";
import type { LaporanP2B, UnitPengaturan } from "@/types";

const LOKASI_OPTIONS = ["Tonasa 2/3", "Tonasa 4", "Tonasa 5", "Lainnya"];
const POSISI_POWER_OPTIONS = ["BTG", "PLN", "PLN ke BTG", "BTG ke PLN"];
const KEGIATAN_OPTIONS = ["Pengaturan Beban", "Inspeksi", "Lainnya"];
const KONDISI_OPTIONS = ["Normal", "Rusak", "Perbaikan"];
const LEVEL_TEGANGAN_OPTIONS = ["70 kV", "6,3 kV"];

function UnitPindahDropdown({ unitPengaturan, value, onChange }: { unitPengaturan: UnitPengaturan[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(", ").filter(Boolean) : [];

  const toggle = (nama: string) => {
    const idx = selected.indexOf(nama);
    if (idx >= 0) selected.splice(idx, 1);
    else selected.push(nama);
    onChange(selected.join(", "));
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Unit yang Pindah</label>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm text-left focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
      >
        {selected.length > 0
          ? <span className="text-gray-900">{selected.length} unit dipilih</span>
          : <span className="text-gray-400">Pilih unit...</span>}
        <span className="float-right mt-0.5">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg p-1.5 space-y-0.5">
            {unitPengaturan.map((u) => {
              const checked = selected.includes(u.nama);
              return (
                <label key={u.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={checked} onChange={() => toggle(u.nama)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  {u.nama}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function emptyForm(user?: { name: string; regu: string }): Omit<LaporanP2B, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    tanggal_jam: new Date().toISOString().slice(0, 16),
    lokasi: "",
    level_tegangan: "",
    kondisi: "",
    posisi_power: "",
    unit_pindah: "",
    aktifitas: "",
    area: "",
    pic: "",
    kegiatan: "Pengaturan Beban",
    temuan: "",
    tindak_lanjut: "",
    keterangan: "",
    nama: user?.name || "",
    regu: user?.regu || "",
  };
}

export default function LaporanP2BPage() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("Admin", "Supervisor", "Operator");
  const isAdmin = hasRole("Admin");
  const isVisitor = user?.role === "Visitor";
  const userRegu = user?.regu || "";

  const [data, setData] = useState<LaporanP2B[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LaporanP2B | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [kegiatanFilter, setKegiatanFilter] = useState("");

  // Unique usernames from data (dibatasi sesuai regu untuk non-admin)
  const usernames = useMemo(() => {
    const names = new Set(
      data
        .filter((r) => isAdmin || !userRegu || r.regu === userRegu)
        .map((r) => r.nama)
        .filter(Boolean),
    );
    return Array.from(names).sort();
  }, [data, isAdmin, userRegu]);

  const isInspeksi = form.kegiatan === "Inspeksi";
  const isPengaturanBeban = form.kegiatan === "Pengaturan Beban";
  const isLainnya = form.kegiatan === "Lainnya";

  // ── Unit Pengaturan (dropdown Unit Pindah) ──
  const [unitPengaturan, setUnitPengaturan] = useState<UnitPengaturan[]>([]);
  useEffect(() => {
    const fetchUnitPengaturan = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from("unit_pengaturan").select("*").order("nama");
      if (data) setUnitPengaturan(data);
    };
    fetchUnitPengaturan();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: rows, error } = await supabase
        .from("laporan_p2b")
        .select("*")
        .order("tanggal_jam", { ascending: false });
      if (error) throw error;
      setData((rows || []) as LaporanP2B[]);
    } catch (err) {
      console.error("fetch laporan_p2b error:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh setiap 30 detik (real-time)
    let timer: ReturnType<typeof setInterval>;
    const start = () => { timer = setInterval(fetchData, 30000); };
    const stop = () => { if (timer) clearInterval(timer); };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") { fetchData(); start(); }
      else { stop(); }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => { stop(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [fetchData]);

  // ── Filter by date range + username + kegiatan + regu ──
  const filtered = data.filter((r) => {
    if (!isInRange(r.tanggal_jam, startDate, endDate)) return false;
    if (usernameFilter && r.nama !== usernameFilter) return false;
    if (kegiatanFilter && r.kegiatan !== kegiatanFilter) return false;
    // Operator/Supervisor hanya lihat data dari regu-nya sendiri (kecuali Dayshift)
    if (!isAdmin && userRegu && userRegu !== "Dayshift" && r.regu !== userRegu) return false;
    return true;
  });

  // ── Cek apakah user bisa edit/hapus baris ini ──
  const canModifyRow = (r: LaporanP2B) => isAdmin || r.nama === user?.name;

  // ── Save (add / edit) ──
  const handleSave = async () => {
    if ((isPengaturanBeban || isLainnya) && !form.lokasi) {
      alert("Lokasi wajib diisi");
      return;
    }
    if (isPengaturanBeban && !form.posisi_power) {
      alert("Posisi Power wajib diisi");
      return;
    }
    if (isPengaturanBeban && !form.area) {
      alert("Unit/Area wajib diisi");
      return;
    }
    if (!form.pic) {
      alert("PIC wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();

      const updateData: any = {
        tanggal_jam: form.tanggal_jam,
        lokasi: form.lokasi,
        level_tegangan: form.level_tegangan || "",
        kondisi: form.kondisi || "",
        posisi_power: form.posisi_power || "",
        unit_pindah: form.unit_pindah || "",
        aktifitas: form.aktifitas || "",
        area: form.area,
        pic: form.pic,
        kegiatan: form.kegiatan,
        temuan: form.temuan || "",
        tindak_lanjut: form.tindak_lanjut || "",
        keterangan: form.keterangan || "",
        nama: user?.name || "",
        regu: user?.regu || "",
        created_by: user?.name || "",
      };

      if (editing) {
        const { error } = await supabase
          .from("laporan_p2b")
          .update(updateData)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("laporan_p2b")
          .insert(updateData)
          .select();
        console.log("[P2B] insert result:", { inserted, error });
        if (error) throw error;
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm(user || undefined));
      fetchData();
    } catch (err) {
      const errObj = err as any;
      console.error("save laporan_p2b error:", errObj);
      alert("Gagal menyimpan data: " + (errObj?.message || errObj?.error_description || JSON.stringify(errObj).slice(0, 200)));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: number) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("laporan_p2b").delete().eq("id", id);
      if (error) throw error;
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      console.error("delete laporan_p2b error:", err instanceof Error ? err.message : err);
      alert("Gagal menghapus data");
    }
  };

  // ── Open edit form ──
  const openEdit = (item: LaporanP2B) => {
    setEditing(item);
    setForm({
      tanggal_jam: item.tanggal_jam ? item.tanggal_jam.slice(0, 16) : "",
      lokasi: item.lokasi,
      level_tegangan: item.level_tegangan || "",
      kondisi: item.kondisi || "",
      posisi_power: item.posisi_power as "" | "BTG" | "PLN" | "PLN ke BTG" | "BTG ke PLN",
      unit_pindah: item.unit_pindah || "",
      aktifitas: item.aktifitas || "",
      area: item.area,
      pic: item.pic,
      kegiatan: item.kegiatan as "Pengaturan Beban" | "Inspeksi" | "Lainnya",
      temuan: item.temuan || "",
      tindak_lanjut: item.tindak_lanjut || "",
      keterangan: item.keterangan || "",
      nama: item.nama || user?.name || "",
      regu: item.regu || user?.regu || "",
    });
    setShowForm(true);
  };

  // ── Open add form ──
  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(user || undefined));
    setShowForm(true);
  };

  // ── WhatsApp share ──
  const sendWhatsApp = (r: LaporanP2B) => {
    const now = new Date().toLocaleString("id-ID", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

    const detail =
      r.kegiatan === "Inspeksi"
        ? `Lokasi : _${r.lokasi}_
Aktifitas : _${r.aktifitas || "-"}_
Kondisi : _${r.kondisi || "-"}_
Temuan : _${r.temuan || "-"}_
Tindak Lanjut : _${r.tindak_lanjut || "-"}_
PIC : _${r.pic}_
Keterangan : _${r.keterangan || "-"}`
        : r.kegiatan === "Pengaturan Beban"
        ? `Lokasi : _${r.lokasi}_
Level Tegangan : _${r.level_tegangan || "-"}_
Posisi Power : _${r.posisi_power || "-"}_
Unit/Area : _${r.area}_
Unit Pindah : _${r.unit_pindah || "-"}_
PIC : _${r.pic}_
Keterangan : _${r.keterangan || "-"}`
        : `Lokasi : _${r.lokasi}_
Aktifitas : _${r.aktifitas || "-"}_
PIC : _${r.pic}_
Keterangan : _${r.keterangan || "-"}_`;

    const message = `*Laporan P2B*
_Seksi Pengaturan Beban_

Kegiatan : _${r.kegiatan}_
${detail}
Nama : _${r.nama}_
Regu : _${r.regu}_

_Date Create : ${now}_
_Dibuat oleh ${user?.name || "-"}_`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // ── PDF download ──
  const handleDownloadPdf = () => {
    const periodLabel = formatPeriod(startDate, endDate);
    const pdfColumns = [
      "Tanggal Jam", "Kegiatan", "Lokasi", "Level Tegangan", "Posisi Power", "Unit/Area", "Kondisi", "Unit Pindah", "Aktifitas", "PIC",
      "Temuan", "Tindak Lanjut", "Keterangan", "Nama", "Regu",
    ];
    const pdfRows = filtered.map((r) => [
      toIndonesianDate(r.tanggal_jam),
      r.kegiatan,
      r.lokasi,
      r.level_tegangan || "-",
      r.posisi_power || "-",
      r.area,
      r.kondisi || "-",
      r.unit_pindah || "-",
      r.aktifitas || "-",
      r.pic,
      r.temuan || "-",
      r.tindak_lanjut || "-",
      r.keterangan || "-",
      r.nama || "-",
      r.regu || "-",
    ]);

    const userSuffix = usernameFilter ? usernameFilter.replace(/\s+/g, "_") : "all";
    const kegiatanSuffix = kegiatanFilter ? kegiatanFilter.replace(/\s+/g, "_") : "all";

    downloadPdf({
      title: "Laporan Pengaturan Beban & Inspeksi",
      period: periodLabel,
      columns: pdfColumns,
      rows: pdfRows,
      filename: `Laporan_P2B_${startDate || "all"}_${endDate || "all"}_${kegiatanSuffix}_${userSuffix}`,
    });
  };

  // ── DataTable columns ──
  const tanggalJamCol = {
    key: "tanggal_jam",
    header: "Tanggal Jam",
    render: (r: LaporanP2B) => <span className="font-semibold">{formatDate(r.tanggal_jam)}</span>,
  };

  const lokasiCol = {
    key: "lokasi",
    header: "Lokasi",
    render: (r: LaporanP2B) => (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        r.lokasi === "Tonasa 2/3" ? "bg-blue-100 text-blue-700" :
        r.lokasi === "Tonasa 4" ? "bg-purple-100 text-purple-700" :
        r.lokasi === "Tonasa 5" ? "bg-green-100 text-green-700" :
        "bg-gray-100 text-gray-600"
      }`}>{r.lokasi}</span>
    ),
  };

  const levelTeganganCol = {
    key: "level_tegangan",
    header: "Level Tegangan",
    render: (r: LaporanP2B) =>
      r.level_tegangan ? (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{r.level_tegangan}</span>
      ) : (
        <span className="text-xs text-gray-300">—</span>
      ),
  };

  const posisiPowerCol = {
    key: "posisi_power",
    header: "Posisi Power",
    render: (r: LaporanP2B) =>
      r.posisi_power ? (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          r.posisi_power === "BTG" ? "bg-green-100 text-green-700" :
          r.posisi_power === "PLN" ? "bg-yellow-100 text-yellow-700" :
          r.posisi_power === "PLN ke BTG" ? "bg-blue-100 text-blue-700" :
          r.posisi_power === "BTG ke PLN" ? "bg-purple-100 text-purple-700" :
          "bg-gray-100 text-gray-600"
        }`}>{r.posisi_power}</span>
      ) : (
        <span className="text-xs text-gray-300">—</span>
      ),
  };

  const unitPindahCol = { key: "unit_pindah", header: "Unit Pindah", render: (r: LaporanP2B) => r.unit_pindah || "-" };
  const aktifitasCol = { key: "aktifitas", header: "Aktifitas", render: (r: LaporanP2B) => r.aktifitas || "-" };

  const kondisiCol = {
    key: "kondisi",
    header: "Kondisi",
    render: (r: LaporanP2B) => (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        r.kondisi === "Normal" ? "bg-green-100 text-green-700" :
        r.kondisi === "Rusak" ? "bg-red-100 text-red-700" :
        r.kondisi === "Perbaikan" ? "bg-yellow-100 text-yellow-700" :
        "bg-gray-100 text-gray-600"
      }`}>{r.kondisi || "-"}</span>
    ),
  };

  const areaCol = { key: "area", header: "Unit/Area", render: (r: LaporanP2B) => r.area };
  const picCol = { key: "pic", header: "PIC", render: (r: LaporanP2B) => r.pic };
  const temuanCol = { key: "temuan", header: "Temuan", render: (r: LaporanP2B) => r.temuan || "-" };
  const tindakLanjutCol = { key: "tindak_lanjut", header: "Tindak Lanjut", render: (r: LaporanP2B) => r.tindak_lanjut || "-" };
  const keteranganCol = { key: "keterangan", header: "Keterangan", render: (r: LaporanP2B) => r.keterangan || "-" };
  const namaCol = { key: "nama", header: "Nama", render: (r: LaporanP2B) => r.nama || "-" };
  const reguCol = { key: "regu", header: "Regu", render: (r: LaporanP2B) => r.regu || "-" };

  const waCol = {
    key: "_whatsapp",
    header: "WA",
    render: (r: LaporanP2B) => (
      <button
        onClick={() => sendWhatsApp(r)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
        title="Kirim via WhatsApp"
      >
        <Send size={12} /> Kirim
      </button>
    ),
  };

  const aksiCol = canEdit
    ? [
        {
          key: "_aksi" as const,
          header: "Aksi",
          render: (r: LaporanP2B) => {
            const canModify = canModifyRow(r);
            return (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => canModify && openEdit(r)}
                  disabled={!canModify}
                  className={`p-1.5 rounded-lg transition-all ${
                    canModify
                      ? "text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                      : "text-gray-200 cursor-not-allowed"
                  }`}
                  title={canModify ? "Edit" : "Hanya bisa edit data sendiri"}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => canModify && setConfirmDelete(r.id)}
                  disabled={!canModify}
                  className={`p-1.5 rounded-lg transition-all ${
                    canModify
                      ? "text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      : "text-gray-200 cursor-not-allowed"
                  }`}
                  title={canModify ? "Hapus" : "Hanya bisa hapus data sendiri"}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          },
        },
      ]
    : [];

  const pengaturanBebanColumns = [
    tanggalJamCol,
    lokasiCol,
    levelTeganganCol,
    posisiPowerCol,
    areaCol,
    unitPindahCol,
    picCol,
    keteranganCol,
    namaCol,
    reguCol,
    waCol,
    ...aksiCol,
  ];

  const inspeksiColumns = [
    tanggalJamCol,
    lokasiCol,
    aktifitasCol,
    kondisiCol,
    temuanCol,
    tindakLanjutCol,
    picCol,
    keteranganCol,
    namaCol,
    reguCol,
    waCol,
    ...aksiCol,
  ];

  const lainnyaColumns = [
    tanggalJamCol,
    lokasiCol,
    aktifitasCol,
    picCol,
    keteranganCol,
    namaCol,
    reguCol,
    waCol,
    ...aksiCol,
  ];

  const pengaturanBebanData = filtered.filter((r) => r.kegiatan === "Pengaturan Beban");
  const inspeksiData = filtered.filter((r) => r.kegiatan === "Inspeksi");
  const lainnyaData = filtered.filter((r) => r.kegiatan === "Lainnya");

  // ── Chart: jumlah inputan per nama ──
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const name = r.nama || "Tanpa Nama";
      counts[name] = (counts[name] || 0) + 1;
    });
    return { labels: Object.keys(counts), data: Object.values(counts) };
  }, [filtered]);

  if (isVisitor) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan P2B</h1>
        <p className="text-sm text-gray-500 mt-1">Pengaturan Beban &amp; Inspeksi Rutin</p>
      </div>

      {/* Filter Tanggal + Username + Kegiatan + PDF */}
      <div className="flex flex-col gap-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
        {/* Baris Tanggal */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Calendar size={14} /> Filter Tanggal
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Baris User */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <User size={14} /> User
          </div>
          <select
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua User</option>
            {usernames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Baris Kegiatan */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Activity size={14} /> Kegiatan
          </div>
          <select
            value={kegiatanFilter}
            onChange={(e) => setKegiatanFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua Kegiatan</option>
            {KEGIATAN_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Baris Download */}
        <button
          onClick={handleDownloadPdf}
          className="w-full sm:w-auto sm:ml-auto p-2 sm:px-3 sm:py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Download size={14} />
          <span>Download PDF</span>
        </button>
      </div>

      {/* Chart Pencapaian */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Pencapaian per Nama</h3>
        </div>
        <LineChart labels={chartData.labels} data={chartData.data} label="Jumlah Inputan" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tabel Pengaturan Beban */}
          <DataTable
            title="Pengaturan Beban"
            columns={pengaturanBebanColumns}
            data={pengaturanBebanData}
            searchPlaceholder="Cari data Pengaturan Beban..."
            actions={
              canEdit && (
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus size={16} /> Tambah
                </button>
              )
            }
          />
          {/* Tabel Inspeksi */}
          <DataTable
            title="Inspeksi"
            columns={inspeksiColumns}
            data={inspeksiData}
            searchPlaceholder="Cari data Inspeksi..."
          />
          {/* Tabel Lainnya */}
          <DataTable
            title="Lainnya"
            columns={lainnyaColumns}
            data={lainnyaData}
            searchPlaceholder="Cari data Lainnya..."
          />
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editing ? "Edit Laporan P2B" : "Tambah Laporan P2B"}</h3>
            </div>
            <div className={`p-6 space-y-4 ${isInspeksi ? '[&_input]:!border-blue-300 [&_input]:![box-shadow:0_0_0_1px_rgba(147,197,253,0.1),0_0_10px_rgba(147,197,253,0.25)] [&_select]:!border-blue-300 [&_select]:![box-shadow:0_0_0_1px_rgba(147,197,253,0.1),0_0_10px_rgba(147,197,253,0.25)] [&_textarea]:!border-blue-300 [&_textarea]:![box-shadow:0_0_0_1px_rgba(147,197,253,0.1),0_0_10px_rgba(147,197,253,0.25)]' : ''}`}>
              {/* Tanggal Jam */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jam *</label>
                <input type="datetime-local" value={form.tanggal_jam} onChange={(e) => setForm({ ...form, tanggal_jam: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
              </div>

              {/* Kegiatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan *</label>
                <select value={form.kegiatan} onChange={(e) => setForm({ ...emptyForm(user || undefined), kegiatan: e.target.value as "Pengaturan Beban" | "Inspeksi" | "Lainnya" })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                  {KEGIATAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Lokasi — untuk Pengaturan Beban & Lainnya */}
              {(isPengaturanBeban || isLainnya) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi *</label>
                <select value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                  <option value="">Pilih Lokasi</option>
                  {LOKASI_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              )}

              {/* Level Tegangan — hanya untuk Pengaturan Beban */}
              {isPengaturanBeban && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level Tegangan</label>
                <select value={form.level_tegangan} onChange={(e) => setForm({ ...form, level_tegangan: e.target.value as "" | "70 kV" | "6,3 kV" })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                  <option value="">Pilih Level Tegangan</option>
                  {LEVEL_TEGANGAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              )}

              {/* Posisi Power — hanya untuk Pengaturan Beban */}
              {isPengaturanBeban && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posisi Power *</label>
                  <select
                    value={form.posisi_power}
                    onChange={(e) => setForm({ ...form, posisi_power: e.target.value as "" | "BTG" | "PLN" | "PLN ke BTG" | "BTG ke PLN" })}
                    className={`w-full px-3.5 py-2.5 border-2 rounded-xl bg-gray-50 text-sm focus:bg-white focus:ring-4 outline-none transition-all ${
                      form.posisi_power === "BTG" || form.posisi_power === "PLN ke BTG"
                        ? "border-green-400 ring-green-500/20 text-green-700"
                        : form.posisi_power === "PLN" || form.posisi_power === "BTG ke PLN"
                        ? "border-yellow-400 ring-yellow-500/20 text-yellow-700"
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Pilih Posisi Power</option>
                    {POSISI_POWER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}

              {/* Unit/Area — untuk Pengaturan Beban */}
              {isPengaturanBeban && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit/Area *</label>
                <input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Contoh: GG-01" />
              </div>
              )}

              {/* Unit Pindah — hanya untuk Pengaturan Beban */}
              {isPengaturanBeban && <UnitPindahDropdown unitPengaturan={unitPengaturan} value={form.unit_pindah} onChange={(v) => setForm({ ...form, unit_pindah: v })} />}

              {/* Aktifitas — untuk Inspeksi & Lainnya */}
              {(isInspeksi || isLainnya) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aktifitas</label>
                <textarea value={form.aktifitas} onChange={(e) => setForm({ ...form, aktifitas: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none" placeholder="Aktifitas" />
              </div>
              )}

              {/* Kondisi — hanya tampil jika Inspeksi */}
              {isInspeksi && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kondisi</label>
                  <select value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value as "Normal" | "Rusak" | "Perbaikan" })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                    {KONDISI_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}

              {/* PIC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIC *</label>
                <input type="text" value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Nama PIC" />
              </div>

              {/* Temuan & Tindak Lanjut — hanya tampil jika Inspeksi */}
              {isInspeksi && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temuan</label>
                    <textarea value={form.temuan} onChange={(e) => setForm({ ...form, temuan: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none" placeholder="Temuan (jika ada)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tindak Lanjut</label>
                    <textarea value={form.tindak_lanjut} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none" placeholder="Tindak lanjut (jika ada)" />
                  </div>
                </>
              )}

              {/* Keterangan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none" placeholder="Keterangan" />
              </div>

              {/* Nama & Regu — read-only, dari user login */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <input type="text" value={form.nama || user?.name || ""} readOnly className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-500 outline-none cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regu</label>
                  <input type="text" value={form.regu || user?.regu || ""} readOnly className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-500 outline-none cursor-not-allowed" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
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
    </div>
  );
}
