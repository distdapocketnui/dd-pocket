"use client";

import { useState } from "react";
import { useData } from "@/context/DataContext";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { SwitchGear } from "@/types";
import { Server, Image as ImageIcon, X } from "lucide-react";

const UNITS = ["Tonasa 2/3", "Tonasa 4", "Tonasa 5", "SG Lainnya"];

export default function SwitchGearPage() {
  const { switchGears } = useData();
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const unitVariants: Array<"blue" | "green" | "yellow" | "red"> = ["blue", "green", "yellow", "red"];
  const counts = UNITS.map((u) => switchGears.filter((s) => s.area === u).length);

  const columns = [
    { key: "name", header: "Switch Gear", render: (s: SwitchGear) => <span className="font-semibold">{s.name}</span> },
    { key: "location", header: "Lokasi", render: (s: SwitchGear) => s.location },
    { key: "status", header: "Status", render: (s: SwitchGear) => <StatusBadge status={s.status} /> },
    { key: "pic", header: "PIC", render: (s: SwitchGear) => s.pic },
    { key: "notifNo", header: "No. Notif", render: (s: SwitchGear) => s.notifNo },
    { key: "lototoNo", header: "No. Lototo", render: (s: SwitchGear) => s.lototoNo },
    { key: "requester", header: "Peminta", render: (s: SwitchGear) => s.requester },
    { key: "activeTime", header: "Waktu Aktif", render: (s: SwitchGear) => s.activeTime, className: "text-gray-500" },
    {
      key: "image", header: "Gambar", render: (s: SwitchGear) => s.image ? (
        <button onClick={() => setLightboxImg(s.image)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors">
          <ImageIcon size={12} /> Lihat
        </button>
      ) : (
        <span className="text-xs text-gray-300">—</span>
      ),
    },
    { key: "description", header: "Keterangan", render: (s: SwitchGear) => (
      <span className="truncate max-w-[150px] block" title={s.description}>{s.description}</span>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Status Switch Gear</h1>
        <p className="text-sm text-gray-500 mt-1">Daftar histori kegiatan lototo, maintenance dan kegiatan yang telah selesai</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {UNITS.map((u, i) => (
          <StatCard key={u} icon={Server} label={`Total SG ${u}`} value={counts[i]} variant={unitVariants[i]} />
        ))}
      </div>

      {/* Per-unit tables */}
      {UNITS.map((unit) => {
        const unitSG = switchGears.filter((s) => s.area === unit);
        return (
          <DataTable
            key={unit}
            title={<span className="flex items-center gap-2"><Server size={16} className="text-blue-600" /> {unit}</span> as unknown as string}
            columns={columns}
            data={unitSG}
            searchPlaceholder="Cari..."
          />
        );
      })}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={lightboxImg} alt="Gambar Switch Gear" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
            <button onClick={() => setLightboxImg(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
