"use client";

import { useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { SwitchGear } from "@/types";
import { downloadPdf } from "@/lib/pdf";
import { isInRange, formatPeriod } from "@/lib/date";
import { Send } from "lucide-react";

export default function LaporanHarianPage() {
  const { switchGears } = useData();
  const { user } = useAuth();
  const isVisitor = user?.role === "Visitor";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredSG = switchGears.filter((s) => isInRange(s.activeTime, startDate, endDate));

  const handleDownloadPdf = () => {
    const periodLabel = formatPeriod(startDate, endDate);

    const columns = ["Switch Gear", "Lokasi", "Unit", "Status", "PIC", "No. Notif", "No. Lototo", "Peminta", "Waktu Aktif", "Waktu Selesai", "Keterangan"];
    const rows = filteredSG.map((s) => [
      s.name, s.location, s.unit, s.status, s.pic, s.notifNo, s.lototoNo, s.requester, s.activeTime, s.finishTime, s.description,
    ]);

    downloadPdf({
      title: "Laporan Monitoring Switch Gear",
      period: periodLabel,
      columns,
      rows,
      filename: `Laporan_Harian_${startDate || "all"}_${endDate || "all"}`,
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

  _Date Create : ${now}_
  _Dibuat oleh ${user?.name || "-"}_`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
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
    { key: "description", header: "Keterangan", render: (s: SwitchGear) => s.description || "-" },
    ...(!isVisitor ? [{
      key: "whatsapp" as const, header: "WhatsApp", render: (s: SwitchGear) => (
        <button onClick={() => sendWhatsApp(s)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Kirim via WhatsApp">
          <Send size={12} /> Kirim
        </button>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Lototo</h1>
        <p className="text-sm text-gray-500 mt-1">Laporan kegiatan maintenance dan LOTOTO.</p>
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
        title="Status Switch Gear"
        columns={columns}
        data={filteredSG}
        searchPlaceholder="Cari switch gear..."
      />
    </div>
  );
}
