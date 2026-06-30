"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar from "@/components/ui/FilterBar";
import { ActivityLog } from "@/types";
import { RefreshCw } from "lucide-react";
import { downloadPdf } from "@/lib/pdf";
import { isInRange, formatPeriod } from "@/lib/date";

export default function AktivitasLogPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && (user.role === "Operator" || user.role === "Supervisor")) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user?.role === "Operator" || user?.role === "Supervisor") return null;

  const { activityLogs } = useData();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = activityLogs.filter((l) => isInRange(l.timestamp, startDate, endDate));

  const handleDownloadPdf = () => {
    const columns = ["Timestamp", "Aksi", "User", "Halaman", "Detail"];
    const rows = filteredLogs.map((l) => [
      l.timestamp, l.action, l.user, l.page, l.details,
    ]);
    downloadPdf({
      title: "Laporan Monitoring Switch Gear",
      period: formatPeriod(startDate, endDate),
      columns,
      rows,
      filename: `Laporan_Aktivitas_${startDate || "awal"}_${endDate || "akhir"}`,
    });
  };

  const columns = [
    { key: "timestamp", header: "Timestamp", render: (l: ActivityLog) => l.timestamp },
    {
      key: "action", header: "Aksi", render: (l: ActivityLog) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
          {l.action}
        </span>
      ),
    },
    { key: "user", header: "User", render: (l: ActivityLog) => l.user },
    { key: "page", header: "Halaman", render: (l: ActivityLog) => l.page },
    { key: "details", header: "Detail", render: (l: ActivityLog) => l.details },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Aktifitas</h1>
        <p className="text-sm text-gray-500 mt-1">Riwayat dan laporan aktivitas pengamanan LOTOTO serta maintenance switch gear.</p>
      </div>

      <FilterBar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onDownloadPdf={handleDownloadPdf}
      />

      <DataTable
        title="Riwayat Aktivitas"
        columns={columns}
        data={filteredLogs}
        searchPlaceholder="Cari aktivitas..."
        actions={
          <button onClick={() => window.location.reload()} className="px-3 py-2 bg-white text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-gray-600">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
    </div>
  );
}
