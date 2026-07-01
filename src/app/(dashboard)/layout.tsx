"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Check, X, Info } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, hasRole } = useAuth();
  const { approvals, approveApproval, rejectApproval } = useData();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [clearedAt, setClearedAt] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("ddp_notif_cleared") || "";
    return "";
  });

  const isSupervisor = user?.role === "Supervisor";
  const myRegu = user?.regu || "";
  const isAdminOrSupervisor = hasRole("Admin", "Supervisor");

  const pendingApprovals = (approvals || []).filter((a) =>
    a.status === "pending" && (!isSupervisor || a.regu === myRegu)
  );
  const myPendingCount = pendingApprovals.length;

  // Approval history untuk operator — approval yang diajukan user sendiri
  const myAllApprovals = (approvals || [])
    .filter((a) => a.requested_by === user?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const myApprovals = myAllApprovals
    .filter((a) => !clearedAt || new Date(a.created_at).getTime() > new Date(clearedAt).getTime())
    .slice(0, 5);

  const myFeedbackCount = myAllApprovals.filter((a) => a.status !== "pending" && (!clearedAt || new Date(a.created_at).getTime() > new Date(clearedAt).getTime())).length;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  const handleClearNotif = () => {
    const now = new Date().toISOString();
    setClearedAt(now);
    localStorage.setItem("ddp_notif_cleared", now);
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case "edit": return "Edit";
      case "delete": return "Hapus";
      case "create": return "Tambah";
      default: return type;
    }
  };

  const getTableLabel = (table: string) => {
    switch (table) {
      case "switch_gears": return "Switch Gear";
      case "users": return "User";
      default: return table;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={`flex flex-col min-h-screen w-full transition-all duration-300 ${
        sidebarCollapsed ? "md:ml-[72px] md:w-[calc(100%-72px)]" : "md:ml-[260px] md:w-[calc(100%-260px)]"
      }`}>
        <Header
          onMobileMenu={() => setMobileOpen(true)}
          notifOpen={notifOpen}
          onNotifToggle={() => setNotifOpen(!notifOpen)}
          pendingCount={isAdminOrSupervisor ? myPendingCount : myFeedbackCount}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full">
          <div className="w-full mx-auto" style={{ maxWidth: '1440px' }}>
            {children}
          </div>
        </main>
        <footer className="text-right px-4 sm:px-6 lg:px-8 pb-4">
          <p className="text-[10px] text-gray-400">© 2026 Unit Distribusi Daya — design by NUI6184</p>
        </footer>
      </div>

      {/* Notification Popup — full screen with blur */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ animation: "notifIn 0.25s ease-out" }}
        >
          <style>{`@keyframes notifIn{from{opacity:0}to{opacity:1}}`}</style>

          {/* Backdrop blur — konten di belakang tetap kelihatan */}
          <div
            className="absolute inset-0 bg-white/60 backdrop-blur-xl"
            onClick={() => setNotifOpen(false)}
          />

          {/* Header */}
          <div className="relative px-5 py-4 border-b border-gray-200/80 flex items-center justify-between bg-white/80 backdrop-blur-md flex-shrink-0">
            <h3 className="text-base font-semibold text-gray-900">Persetujuan</h3>
            <div className="flex items-center gap-2">
              {isAdminOrSupervisor ? (
                myPendingCount > 0 && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {myPendingCount} menunggu
                  </span>
                )
              ) : (
                <>
                  {myFeedbackCount > 0 && (
                    <button onClick={handleClearNotif} className="text-[10px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full transition-colors">
                      Bersihkan
                    </button>
                  )}
                  {myApprovals.length > 0 && (
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {myApprovals.length}
                    </span>
                  )}
                </>
              )}
              <button onClick={() => setNotifOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative flex-1 overflow-y-auto">
            {isAdminOrSupervisor ? (
              /* ── Admin/Supervisor: pending approvals ── */
              pendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
                  <Info size={32} className="mb-2 opacity-50" />
                  <span className="text-sm">Tidak ada permintaan menunggu</span>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {pendingApprovals.map((a) => (
                    <div key={a.id} className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-gray-100/80">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              a.action_type === "edit" ? "bg-yellow-100/90 text-yellow-700" :
                              a.action_type === "delete" ? "bg-red-100/90 text-red-700" :
                              "bg-green-100/90 text-green-700"
                            }`}>
                              {getActionLabel(a.action_type)}
                            </span>
                            <span className="text-xs font-medium text-gray-800">{getTableLabel(a.table_name)}</span>
                            {a.action_type !== "create" && <span className="text-[10px] text-gray-400">#{a.record_id}</span>}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">
                            oleh <span className="font-medium text-gray-600">{a.requested_by_name}</span>
                          </p>
                          {(a.action_type === "edit" || a.action_type === "create") && a.new_data && (
                            <div className="mt-1.5 space-y-0.5">
                              {a.new_data.name && <p className="text-xs text-gray-400">SG: {a.new_data.name}</p>}
                              {a.new_data.status && <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                a.new_data.status === "Aktif Lototo" ? "bg-red-50/90 text-red-700" :
                                a.new_data.status === "Maintenance" ? "bg-amber-50/90 text-amber-700" :
                                "bg-emerald-50/90 text-emerald-700"
                              }`}>{a.new_data.status}</span>}
                              {a.new_data.location && <p className="text-xs text-gray-400">Lokasi: {a.new_data.location}</p>}
                              {a.new_data.unit && <p className="text-xs text-gray-400">Unit: {a.new_data.unit}</p>}
                            </div>
                          )}
                          {a.action_type === "delete" && a.old_data && (
                            <div className="mt-1.5 space-y-0.5">
                              {a.old_data.name && <p className="text-xs text-gray-400">SG: {a.old_data.name}</p>}
                              {a.old_data.status && <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                a.old_data.status === "Aktif Lototo" ? "bg-red-50/90 text-red-700" :
                                a.old_data.status === "Maintenance" ? "bg-amber-50/90 text-amber-700" :
                                "bg-emerald-50/90 text-emerald-700"
                              }`}>{a.old_data.status}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => approveApproval(a.id)} className="flex-1 px-3 py-2 bg-emerald-500/90 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                          <Check size={14} /> Setuju
                        </button>
                        <button onClick={() => rejectApproval(a.id)} className="flex-1 px-3 py-2 bg-gray-100/90 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                          <X size={14} /> Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── Operator: riwayat approval sendiri ── */
              myApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
                  <Info size={32} className="mb-2 opacity-50" />
                  <span className="text-sm">Belum ada permintaan</span>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {myApprovals.map((a) => (
                    <div key={a.id} className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-gray-100/80">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              a.action_type === "edit" ? "bg-yellow-100/90 text-yellow-700" :
                              a.action_type === "delete" ? "bg-red-100/90 text-red-700" :
                              "bg-green-100/90 text-green-700"
                            }`}>
                              {getActionLabel(a.action_type)}
                            </span>
                            <span className="text-xs font-medium text-gray-800">{getTableLabel(a.table_name)}</span>
                            {a.action_type !== "create" && <span className="text-[10px] text-gray-400">#{a.record_id}</span>}
                            {/* Status badge */}
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              a.status === "approved" ? "bg-emerald-100/90 text-emerald-700" :
                              a.status === "rejected" ? "bg-red-100/90 text-red-700" :
                              "bg-gray-100/90 text-gray-500"
                            }`}>
                              {a.status === "approved" ? "Disetujui" : a.status === "rejected" ? "Ditolak" : "Menunggu"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-500">diajukan</span>
                            <span className="text-[10px] text-gray-400">{a.created_at ? new Date(a.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                          </div>
                          {a.new_data?.name && <p className="text-xs text-gray-400 mt-1">SG: {a.new_data.name}</p>}
                          {a.old_data?.name && a.action_type === "delete" && <p className="text-xs text-gray-400 mt-1">SG: {a.old_data.name}</p>}
                          {a.review_notes && (
                            <p className="text-[11px] text-gray-500 mt-1 italic">Catatan: {a.review_notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
