"use client";

import { useData } from "@/context/DataContext";
import StatCard from "@/components/ui/StatCard";
import DonutChart from "@/components/ui/DonutChart";
import { Layers, CheckCircle, Wrench, CheckCheck, Shield, AlertTriangle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { switchGears } = useData();

  const aktif = switchGears.filter((s) => s.status === "Aktif Lototo").length;
  const maintenance = switchGears.filter((s) => s.status === "Maintenance").length;
  const selesai = switchGears.filter((s) => s.status === "Selesai").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring LOTOTO</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoring pengamanan switch gear dan status LOTOTO pra maintenance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Total Pekerjaan" value={switchGears.length} subtext="Total semua SG" variant="blue" />
        <StatCard icon={CheckCircle} label="Lototo Aktif" value={aktif} subtext="Dalam pengamanan" variant="green" href="/lototo" />
        <StatCard icon={Wrench} label="SG Maintenance" value={maintenance} subtext="Sedang maintenance" variant="yellow" href="/sg-maintenance" />
        <StatCard icon={CheckCheck} label="SG Selesai" value={selesai} subtext="Selesai maintenance" variant="red" />
      </div>

      {/* Chart + Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Overview Status
          </h3>
          <DonutChart aktif={aktif} maintenance={maintenance} selesai={selesai} mode="combined" />
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Informasi Cepat
          </h3>
          <div className="space-y-3">
            {[
              { icon: Shield, color: "bg-blue-50 text-blue-600", title: "Prosedur LOTOTO", desc: "Pastikan lockout/tagout sesuai prosedur" },
              { icon: AlertTriangle, color: "bg-amber-50 text-amber-600", title: "Maintenance Aktif", desc: `${maintenance} switch gear sedang dalam perawatan` },
              { icon: Clock, color: "bg-emerald-50 text-emerald-600", title: "Last Updated", desc: "Data real-time monitoring switch gear" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3.5 p-3.5 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
