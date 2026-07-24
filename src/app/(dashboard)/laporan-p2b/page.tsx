"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import DataTable from "@/components/ui/DataTable";
import { downloadPdfMulti } from "@/lib/pdf";
import { isInRange, formatPeriod, toIndonesianDate, getCurrentDatetimeLocal } from "@/lib/date";
import { Plus, Edit3, Trash2, Loader2, Send, Calendar, Download, User, Activity, BarChart3, RefreshCw } from "lucide-react";
import LineChart from "@/components/ui/LineChart";
import ImageUpload from "@/components/ui/ImageUpload";
import ImageGallery from "@/components/ui/ImageGallery";
import type { LaporanP2B, UnitPengaturan } from "@/types";
import { logger } from "@/lib/logger";
import { canAccessRoute } from "@/lib/route-protection";

const LOKASI_OPTIONS = ["Tonasa 2/3", "Tonasa 4", "Tonasa 5", "Power House", "Power Plant", "Tambang", "Lainnya"];
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
              const checked = selected.includes(u.name);
              return (
                <label key={u.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={checked} onChange={() => toggle(u.name)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  {u.name}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PicDropdown({ users, value, onChange }: { users: { id: number; name: string; regu?: string }[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(", ").filter(Boolean) : [];
  const filteredUsers = users.filter(u => u.regu); // Hanya tampilkan user yang memiliki regu

  const toggle = (name: string) => {
    const idx = selected.indexOf(name);
    if (idx >= 0) selected.splice(idx, 1);
    else selected.push(name);
    onChange(selected.join(", "));
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm text-left focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
      >
        {selected.length > 0
          ? <span className="text-gray-900">{selected.length} PIC dipilih</span>
          : <span className="text-gray-400">Pilih PIC...</span>}
        <span className="float-right mt-0.5">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg p-1.5 space-y-0.5">
            {filteredUsers.map((u) => {
              const checked = selected.includes(u.name);
              return (
                <label key={u.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={checked} onChange={() => toggle(u.name)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  {u.name}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function formatDate(iso: string) {
  if (!iso) return "-";
  // Abaikan timezone, ekstrak YYYY-MM-DDTHH:mm langsung dari string
  const clean = iso.replace(/[Zz].*$/, "").replace(/[+-]\d{2}:?\d{2}$/, "").trim();
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return "-";
  const [, y, month, d, hh, mm] = m;
  return `${parseInt(d)} ${MONTHS[parseInt(month) - 1]} ${y} ${hh}:${mm}`;
}

function emptyForm(user?: { name: string; regu: string }, kegiatan: "Pengaturan Beban" | "Inspeksi" | "Lainnya" = "Pengaturan Beban") {
  return {
    tanggal_jam: getCurrentDatetimeLocal(),
    lokasi: "",
    level_tegangan: "",
    kondisi: "",
    posisi_power: "",
    unit_pindah: "",
    aktifitas: "",
    area: "",
    pic: user?.name || "",
    kegiatan: kegiatan,
    temuan: "",
    tindak_lanjut: "",
    keterangan: "",
    image: "",
    images: [] as string[],
    nama: user?.name || "",
    regu: user?.regu || "",
  };
}

export default function LaporanP2BPage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const canEdit = hasRole("Admin", "Supervisor", "Operator");
  const canViewAllData = hasRole("Admin", "Supervisor", "Operator", "Manager");
  const isAdmin = hasRole("Admin");
  const isVisitor = user?.role === "Visitor";
  const isManager = user?.role === "Manager";
  const userRegu = user?.regu || "";

  // Proteksi route: redirect ke dashboard jika role tidak punya akses
  useEffect(() => {
    if (!canAccessRoute("/laporan-p2b", user?.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const [data, setData] = useState<LaporanP2B[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LaporanP2B | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Filter state — default ke kosong
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [kegiatanFilter, setKegiatanFilter] = useState("");
  const [showConfirmDownload, setShowConfirmDownload] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pengaturan' | 'inspeksi' | 'lainnya'>('pengaturan');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; skipped: number; error?: string } | null>(null);

  // Unique usernames from data (dibatasi sesuai regu untuk Manager/Visitor)
  const usernames = useMemo(() => {
    const names = new Set(
      data
        .filter((r) => canViewAllData || !userRegu || r.regu === userRegu)
        .map((r) => r.nama)
        .filter(Boolean),
    );
    return Array.from(names).sort();
  }, [data, canViewAllData, userRegu]);

  const isInspeksi = form.kegiatan === "Inspeksi";
  const isPengaturanBeban = form.kegiatan === "Pengaturan Beban";
  const isLainnya = form.kegiatan === "Lainnya";

  // ── Unit Pengaturan (dropdown Unit Pindah) ──
  const [unitPengaturan, setUnitPengaturan] = useState<UnitPengaturan[]>([]);
  useEffect(() => {
    const fetchUnitPengaturan = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from("equipment").select("*").order("name");
      if (data) setUnitPengaturan(data);
    };
    fetchUnitPengaturan();
  }, []);

  // ── Users untuk multi-select PIC ──
  const [picUsers, setPicUsers] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    const fetchPicUsers = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id, name, regu")
        .in("role", ["Admin", "Supervisor", "Operator"])
        .order("name");
      if (data) setPicUsers(data);
    };
    fetchPicUsers();
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
      logger.error('fetch laporan_p2b error', err);
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
    // Filter by PIC (bukan by nama pembuat laporan)
    if (usernameFilter) {
      const pics = r.pic ? r.pic.split(", ").filter(Boolean) : [];
      if (!pics.includes(usernameFilter)) return false;
    }
    if (kegiatanFilter && r.kegiatan !== kegiatanFilter) return false;
    // Manager/Visitor hanya lihat data dari regu-nya sendiri (kecuali Dayshift)
    if (!canViewAllData && userRegu && userRegu !== "Dayshift" && r.regu !== userRegu) return false;
    return true;
  });

  // ── Cek apakah user bisa edit/hapus baris ini ──
  const canModifyRow = (r: LaporanP2B) => isAdmin || r.nama === user?.name;

  // ── Sync P2B Pengaturan Beban ke Equipment Logs ──
  const handleSyncToEquipmentLogs = async () => {
    if (!canEdit) {
      alert("Anda tidak memiliki akses untuk sync data.");
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const supabase = getSupabaseClient();

      // 1. Fetch equipment list
      const { data: equipmentList, error: eqError } = await supabase
        .from("equipment")
        .select("id, name, unit, main1, main2, main3")
        .eq("is_active", true)
        .order("name");

      if (eqError || !equipmentList) throw new Error("Gagal mengambil data equipment");

      // 2. Ambil data P2B Pengaturan Beban yang sudah difilter
      const p2bData = pengaturanBebanData;

      let successCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // 3. Loop setiap record P2B
      for (const p2b of p2bData) {
        if (!p2b.unit_pindah || p2b.unit_pindah.trim() === "") continue;

        // Parse unit_pindah (bisa multiple: "Finish mill 5, crusher 3")
        const unitNames = p2b.unit_pindah.split(",").map((u) => u.trim()).filter(Boolean);

        for (const unitName of unitNames) {
          // Cari equipment by name (case-insensitive)
          const equipment = equipmentList.find(
            (e) => e.name.toLowerCase() === unitName.toLowerCase()
          );

          if (!equipment) {
            errors.push(`Equipment "${unitName}" tidak ditemukan di master data.`);
            continue;
          }

          // 4. Cek duplikasi: equipment_id + timestamp yang sama
          const { data: existingLogs } = await supabase
            .from("equipment_logs")
            .select("id")
            .eq("equipment_id", equipment.id)
            .eq("timestamp", p2b.tanggal_jam)
            .maybeSingle();

          if (existingLogs) {
            skippedCount++;
            continue;
          }

          // 5. Ambil last equipment log sebelum timestamp P2B
          const { data: lastLog } = await supabase
            .from("equipment_logs")
            .select("*")
            .eq("equipment_id", equipment.id)
            .lt("timestamp", p2b.tanggal_jam)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastLogAny = lastLog as any;

          // 6. Mapping posisi_power
          let mappedPosisiPower: string | null = null;
          if (p2b.posisi_power) {
            if (p2b.posisi_power.includes("BTG")) mappedPosisiPower = "BTG";
            else if (p2b.posisi_power.includes("PLN")) mappedPosisiPower = "PLN";
          }

          // 7. Build payload
          const payload = {
            equipment_id: equipment.id,
            event_type: lastLogAny?.event_type || "HEATING_UP",
            timestamp: p2b.tanggal_jam,
            reason: lastLogAny?.reason || null,
            shift: lastLogAny?.shift || "Dayshift",
            update_beban_pln: null,
            update_beban_btg: null,
            created_by: p2b.created_by || p2b.nama || "",
            posisi_power: mappedPosisiPower,
            main1: lastLogAny?.main1 || equipment.main1 || null,
            main2: lastLogAny?.main2 || equipment.main2 || null,
            main3: lastLogAny?.main3 || equipment.main3 || null,
          };

          // 8. Insert equipment log
          const { error: insertError } = await supabase
            .from("equipment_logs")
            .insert(payload as any);

          if (insertError) {
            errors.push(`Gagal sync "${unitName}": ${insertError.message}`);
          } else {
            successCount++;
          }
        }
      }

      setSyncResult({ success: successCount, skipped: skippedCount });
      alert(
        `Sync selesai!\n\n✅ Berhasil: ${successCount} data\n⏭️ Dilewati (duplikat): ${skippedCount} data${errors.length > 0 ? "\n❌ Error: " + errors.slice(0, 3).join("\n") : ""}`
      );
    } catch (err: any) {
      setSyncResult({ success: 0, skipped: 0, error: err.message });
      alert("Gagal sync: " + (err.message || JSON.stringify(err)));
    } finally {
      setSyncing(false);
    }
  };

  // ── Save (add / edit) ──
  const handleSave = async () => {
    if ((isPengaturanBeban || isLainnya || isInspeksi) && !form.lokasi) {
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
        image: form.images[0] || "",
        images: JSON.stringify(form.images),
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
        logger.info('[P2B] insert result', { inserted, error });
        if (error) throw error;
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm(user || undefined));
      fetchData();
    } catch (err) {
      const errObj = err as any;
      logger.error('save laporan_p2b error', errObj);
      alert("Gagal menyimpan data: " + (errObj?.message || errObj?.error_description || JSON.stringify(errObj).slice(0, 200)));
    } finally {
      setSaving(false);
    }
  };

  // ── Ambil URL gambar dari field images (JSON) atau image (single) ──
  const getImages = (item: LaporanP2B): string[] => {
    try {
      const parsed = item.images ? JSON.parse(item.images) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : item.image ? [item.image] : [];
    } catch {
      return item.image ? [item.image] : [];
    }
  };

  // ── Delete ──
  const handleDelete = async (id: number) => {
    try {
      const supabase = getSupabaseClient();

      // Ambil data dulu untuk dapat URL gambar
      const { data: item } = await supabase
        .from("laporan_p2b")
        .select("image, images")
        .eq("id", id)
        .single();

      // Hapus file gambar dari storage
      if (item) {
        const imageUrls: string[] = [];
        try {
          const parsed = JSON.parse(item.images || "[]");
          if (Array.isArray(parsed)) imageUrls.push(...parsed);
        } catch {}
        if (item.image && !imageUrls.includes(item.image)) imageUrls.push(item.image);

        if (imageUrls.length > 0) {
          await fetch("/api/storage/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: imageUrls }),
          });
        }
      }

      const { error } = await supabase.from("laporan_p2b").delete().eq("id", id);
      if (error) throw error;
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      logger.error('delete laporan_p2b error', err);
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
		image: item.image || "",
		images: getImages(item),
      nama: item.nama || user?.name || "",
      regu: item.regu || user?.regu || "",
    });

    setShowForm(true);
  };

  // ── Open add form ──
  const openAdd = (kegiatan: "Pengaturan Beban" | "Inspeksi" | "Lainnya" = "Pengaturan Beban") => {
    setEditing(null);

    setForm(emptyForm(user || undefined, kegiatan));
    setShowForm(true);
  };

  // ── WhatsApp share ──
  const sendWhatsApp = (r: LaporanP2B) => {
    const now = new Date().toLocaleString("id-ID", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

    let detail = "";
    if (r.kegiatan === "Inspeksi") {
      detail = `*Aktifitas :* _${r.aktifitas || "-"}_\n*Lokasi :* _${r.lokasi}_\n*Kondisi :* _${r.kondisi || "-"}_\n*Temuan :* _${r.temuan || "-"}_\n*Tindak Lanjut :* _${r.tindak_lanjut || "-"}_`;
    } else if (r.kegiatan === "Pengaturan Beban") {
      detail = `*Lokasi :* _${r.lokasi}_\n*Level Tegangan :* _${r.level_tegangan || "-"}_\n*Posisi Power :* _${r.posisi_power || "-"}_\n*Unit/Area :* _${r.area}_\n*Unit Pindah :* _${r.unit_pindah || "-"}_`;
    } else {
      detail = `*Lokasi :* _${r.lokasi}_\n*Aktifitas :* _${r.aktifitas || "-"}_`;
    }

    const message = `--------------------------------\n*Laporan P2B*\n_Seksi Pengaturan Beban_\n--------------------------------\n\n*Kegiatan :* _${r.kegiatan}_\n*Tanggal Jam :* _${formatDate(r.tanggal_jam)}_\n${detail}\n*PIC :* _${r.pic}_\n*Keterangan :* _${r.keterangan || "-"}_\n*Nama :* _${r.nama}_\n*Regu :* _${r.regu}_\n\n--------------------------------\n_Date Create : ${now}_\n_Send by *${user?.name || "-"}*_\n--------------------------------\n_Source : https://distda-pocketnui.biz.id_\n--------------------------------`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // ── PDF download ──
  const handleDownloadPdf = () => {
    const periodLabel = formatPeriod(startDate, endDate);

    const toDate = (iso: string) => toIndonesianDate(iso);

    const pengaturanRows = pengaturanBebanData.map((r) => [
      toDate(r.tanggal_jam), r.lokasi, r.level_tegangan || "-",
      r.posisi_power || "-", r.area, r.unit_pindah || "-",
      r.pic, r.keterangan || "-", r.regu || "-",
    ]);

    const inspeksiRows = inspeksiData.map((r) => [
      toDate(r.tanggal_jam), r.lokasi, r.aktifitas || "-",
      r.kondisi || "-", r.temuan || "-", r.tindak_lanjut || "-",
      r.pic, r.keterangan || "-", r.regu || "-",
    ]);

    const lainnyaRows = lainnyaData.map((r) => [
      toDate(r.tanggal_jam), r.lokasi, r.aktifitas || "-",
      r.pic, r.keterangan || "-", r.regu || "-",
    ]);

    const userSuffix = usernameFilter ? usernameFilter.replace(/\s+/g, "_") : "all";
    const kegiatanSuffix = kegiatanFilter ? kegiatanFilter.replace(/\s+/g, "_") : "all";

    downloadPdfMulti({
      title: "Laporan Pengaturan Beban, Inspeksi & Lainnya",
      period: periodLabel,
      sections: [
        {
          title: "Pengaturan Beban",
          columns: ["Tanggal Jam", "Lokasi", "Level Tegangan", "Posisi Power", "Unit/Area", "Unit Pindah", "PIC", "Keterangan", "Regu"],
          rows: pengaturanRows,
        },
        {
          title: "Inspeksi",
          columns: ["Tanggal Jam", "Lokasi", "Aktifitas", "Kondisi", "Temuan", "Tindak Lanjut", "PIC", "Keterangan", "Regu"],
          rows: inspeksiRows,
        },
        {
          title: "Lainnya",
          columns: ["Tanggal Jam", "Lokasi", "Aktifitas", "PIC", "Keterangan", "Regu"],
          rows: lainnyaRows,
        },
      ],
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
        r.lokasi === "Tonasa 2/3" ? "bg-orange-100 text-orange-700" :
        r.lokasi === "Tonasa 4" ? "bg-purple-100 text-purple-700" :
        r.lokasi === "Tonasa 5" ? "bg-blue-100 text-blue-700" :
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
          r.posisi_power === "BTG" || r.posisi_power === "PLN ke BTG" ? "bg-green-100 text-green-700" :
          r.posisi_power === "PLN" || r.posisi_power === "BTG ke PLN" ? "bg-yellow-100 text-yellow-700" :
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
  const gambarCol = {
    key: "image", header: "Gambar", render: (r: LaporanP2B) => {
      const imgs = getImages(r);
      return imgs.length > 0 ? <ImageGallery images={imgs} /> : <span className="text-xs text-gray-300">—</span>;
    },
  };
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
                {r.kegiatan === "Pengaturan Beban" && (
                  <button
                    onClick={() => handleSyncToEquipmentLogs()}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                    title="Sync ke Equipment Logs"
                  >
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>
            );
          },
        },
      ]
    : [];;

  const pengaturanBebanColumns = [
    tanggalJamCol,
    lokasiCol,
    levelTeganganCol,
    posisiPowerCol,
    areaCol,
    unitPindahCol,
    picCol,
    keteranganCol,
    gambarCol,
    namaCol,
    reguCol,
    ...(!isManager ? [waCol] : []),
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
    gambarCol,
    namaCol,
    reguCol,
    ...(!isManager ? [waCol] : []),
    ...aksiCol,
  ];

  const lainnyaColumns = [
    tanggalJamCol,
    lokasiCol,
    aktifitasCol,
    picCol,
    keteranganCol,
    gambarCol,
    namaCol,
    reguCol,
    ...(!isManager ? [waCol] : []),
    ...aksiCol,
  ];

  const pengaturanBebanData = filtered.filter((r) => r.kegiatan === "Pengaturan Beban");
  const inspeksiData = filtered.filter((r) => r.kegiatan === "Inspeksi");
  const lainnyaData = filtered.filter((r) => r.kegiatan === "Lainnya");

  // ── Rekap Laporan per Personil ──
  const rekapMap = new Map<string, { pengaturanBeban: number; inspeksi: number; lainnya: number }>();
  filtered.forEach((r) => {
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

  const rekapTotalPB = rekapRows.reduce((sum, r) => sum + r.pengaturanBeban, 0);
  const rekapTotalInspeksi = rekapRows.reduce((sum, r) => sum + r.inspeksi, 0);
  const rekapTotalLainnya = rekapRows.reduce((sum, r) => sum + r.lainnya, 0);

  // ── Chart: jumlah inputan per nama ──
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const pics = r.pic ? r.pic.split(", ").filter(Boolean) : ["Tanpa PIC"];
      pics.forEach((pic) => {
        counts[pic] = (counts[pic] || 0) + 1;
      });
    });
    return { labels: Object.keys(counts), data: Object.values(counts) };
  }, [filtered]);

  if (isVisitor) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Harian P2B</h1>
        <p className="text-sm text-gray-500 mt-1">Pengaturan Beban &amp; Inspeksi Rutin</p>
      </div>

      {/* Filter Tanggal + Username + Kegiatan + PDF */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
        {/* Desktop: 1 baris full width */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Tanggal */}
          <div className="flex items-center gap-2 flex-1">
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

          {/* User */}
          <select
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua User</option>
            {usernames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Kegiatan */}
          <select
            value={kegiatanFilter}
            onChange={(e) => setKegiatanFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua Kegiatan</option>
            {KEGIATAN_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          {/* Download PDF */}
          <button
            onClick={() => setShowConfirmDownload(true)}
            className="ml-auto px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>

        {/* Mobile: 3 baris */}
        <div className="lg:hidden flex flex-col gap-2">
          {/* Tanggal (full width) */}
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

          {/* User + Kegiatan (1 baris) */}
          <div className="flex items-center gap-2">
            <select
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Semua User</option>
              {usernames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={kegiatanFilter}
              onChange={(e) => setKegiatanFilter(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Semua Kegiatan</option>
              {KEGIATAN_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Download PDF (full width) */}
          <button
            onClick={() => setShowConfirmDownload(true)}
            className="w-full px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>


      {/* Chart Pencapaian */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Statistik Inputan Laporan</h3>
        </div>
        <LineChart labels={chartData.labels} data={chartData.data} label="Jumlah Inputan" />
      </div>

      {/* Segmented Control - Filter Tabel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
          <button
            onClick={() => setActiveTab('pengaturan')}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              activeTab === 'pengaturan'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pengaturan Beban
          </button>
          <button
            onClick={() => setActiveTab('inspeksi')}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              activeTab === 'inspeksi'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Inspeksi
          </button>
          <button
            onClick={() => setActiveTab('lainnya')}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              activeTab === 'lainnya'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lainnya
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tabel Pengaturan Beban */}
          {(activeTab === 'all' || activeTab === 'pengaturan') && (
            <DataTable
              title="Pengaturan Beban"
              columns={pengaturanBebanColumns}
              data={pengaturanBebanData}
              searchPlaceholder="Cari data Pengaturan Beban..."
              getRowClass={(r) =>
                r.posisi_power === "BTG" || r.posisi_power === "PLN ke BTG"
                  ? "hover:bg-green-100"
                  : r.posisi_power === "PLN" || r.posisi_power === "BTG ke PLN"
                  ? "hover:bg-yellow-100"
                  : ""
              }
              actions={
                canEdit && (
                  <button
                    onClick={() => { setActiveTab('pengaturan'); openAdd('Pengaturan Beban'); }}
                    className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Plus size={16} /> Tambah Data
                  </button>
                )
              }
            />
          )}
          {/* Tabel Inspeksi */}
          {(activeTab === 'all' || activeTab === 'inspeksi') && (
            <DataTable
              title="Inspeksi"
              columns={inspeksiColumns}
              data={inspeksiData}
              searchPlaceholder="Cari data Inspeksi..."
              actions={
                canEdit && (
                  <button
                    onClick={() => { setActiveTab('inspeksi'); openAdd('Inspeksi'); }}
                    className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Plus size={16} /> Tambah Data
                  </button>
                )
              }
            />
          )}
          {/* Tabel Lainnya */}
          {(activeTab === 'all' || activeTab === 'lainnya') && (
            <DataTable
              title="Lainnya"
              columns={lainnyaColumns}
              data={lainnyaData}
              searchPlaceholder="Cari data Lainnya..."
              actions={
                canEdit && (
                  <button
                    onClick={() => { setActiveTab('lainnya'); openAdd('Lainnya'); }}
                    className="btn-glow flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Plus size={16} /> Tambah Data
                  </button>
                )
              }
            />
          )}

          {/* Rekap Laporan Harian P2B */}
          <DataTable
            title={
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Rekap Laporan Harian P2B
                </span>
                {rekapRows.length > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full ml-auto">
                    Total: {rekapTotalPB + rekapTotalInspeksi + rekapTotalLainnya} Laporan
                  </span>
                )}
              </div>
            }
            columns={[
              { key: "nama", header: "Nama Personil", render: (r: { nama: string; pengaturanBeban: number; inspeksi: number; lainnya: number }) => <span className="font-medium text-gray-800">{r.nama}</span> },
              { key: "pengaturanBeban", header: "Pengaturan Beban", render: (r: { nama: string; pengaturanBeban: number; inspeksi: number; lainnya: number }) => <span className="text-center block">{r.pengaturanBeban}</span> },
              { key: "inspeksi", header: "Inspeksi", render: (r: { nama: string; pengaturanBeban: number; inspeksi: number; lainnya: number }) => <span className="text-center block">{r.inspeksi}</span> },
              { key: "lainnya", header: "Lainnya", render: (r: { nama: string; pengaturanBeban: number; inspeksi: number; lainnya: number }) => <span className="text-center block">{r.lainnya}</span> },
            ]}
            data={rekapRows}
            searchable={true}
            searchPlaceholder="Cari nama personil..."
          />
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editing ? "Edit Laporan Harian P2B" : "Tambah Laporan Harian P2B"}</h3>
            </div>
            <div className={`p-6 space-y-4 ${
              isPengaturanBeban
                ? '[&_input]:!border-green-200 [&_input]:![box-shadow:0_0_0_1px_rgba(134,239,172,0.15),0_0_6px_rgba(134,239,172,0.12)] [&_select]:!border-green-200 [&_select]:![box-shadow:0_0_0_1px_rgba(134,239,172,0.15),0_0_6px_rgba(134,239,172,0.12)] [&_textarea]:!border-green-200 [&_textarea]:![box-shadow:0_0_0_1px_rgba(134,239,172,0.15),0_0_6px_rgba(134,239,172,0.12)]'
                : isInspeksi
                ? '[&_input]:!border-red-200 [&_input]:![box-shadow:0_0_0_1px_rgba(252,165,165,0.15),0_0_6px_rgba(252,165,165,0.12)] [&_select]:!border-red-200 [&_select]:![box-shadow:0_0_0_1px_rgba(252,165,165,0.15),0_0_6px_rgba(252,165,165,0.12)] [&_textarea]:!border-red-200 [&_textarea]:![box-shadow:0_0_0_1px_rgba(252,165,165,0.15),0_0_6px_rgba(252,165,165,0.12)]'
                : isLainnya
                ? '[&_input]:!border-blue-200 [&_input]:![box-shadow:0_0_0_1px_rgba(147,197,253,0.15),0_0_6px_rgba(147,197,253,0.12)] [&_select]:!border-blue-200 [&_select]:![box-shadow:0_0_0_1px_rgba(147,197,253,0.15),0_0_6px_rgba(147,197,253,0.12)] [&_textarea]:!border-blue-200 [&_textarea]:![box-shadow:0_0_0_1px_rgba(147,197,253,0.15),0_0_6px_rgba(147,197,253,0.12)]'
                : ''
            }`}>
              {/* Tanggal Jam */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jam *</label>
                <input type="datetime-local" value={form.tanggal_jam} onChange={(e) => setForm({ ...form, tanggal_jam: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
              </div>

              {/* Kegiatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan *</label>
                <input
                  type="text"
                  value={form.kegiatan}
                  readOnly
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-500 outline-none cursor-not-allowed"
                />
              </div>

              {/* Lokasi */}
              {isPengaturanBeban || isLainnya || isInspeksi ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi *</label>
                <select value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                  <option value="">Pilih Lokasi</option>
                  {LOKASI_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              ) : null}

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
                <PicDropdown users={picUsers} value={form.pic} onChange={(v) => setForm({ ...form, pic: v })} />
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

              {/* Upload Gambar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Gambar (max 3)</label>
                <ImageUpload
                  existingUrls={form.images}
                  onImagesChange={(urls) => setForm(prev => ({ ...prev, images: urls }))}
                  onUploadingChange={setIsUploading}
                />
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
              <button onClick={handleSave} disabled={saving || isUploading} className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
                {saving || isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isUploading ? "Mengupload..." : editing ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Download ── */}
      {showConfirmDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowConfirmDownload(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Konfirmasi Download</h3>
            <p className="text-sm text-gray-500 mb-6">Apakah data yang ingin di download sudah benar?</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowConfirmDownload(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={() => { setShowConfirmDownload(false); handleDownloadPdf(); }} className="px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors">OK</button>
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
