"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard, Lock, Wrench, FileText, Users, ChevronLeft, X, Database, ClipboardList, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getInitials } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/laporan-p2b", label: "Laporan P2B", icon: ClipboardList, glow: "green" },
  { href: "/pengguna", label: "Pengguna", icon: Users },
  { href: "/database-status", label: "DB Status", icon: Database },
];

const SWITCHGEAR_ITEMS = [
  { href: "/lototo", label: "Lototo", icon: Lock, badgeKey: "lototo", glow: "red" },
  { href: "/sg-maintenance", label: "SG Maintenance", icon: Wrench, badgeKey: "maintenance" },
  { href: "/laporan-lototo", label: "Laporan Lototo", icon: FileText },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { switchGears } = useData();
  const [switchgearOpen, setSwitchgearOpen] = useState(false);

  const role = user?.role;
  const isOperator = role === "Operator";
  const isSupervisor = role === "Supervisor";
  const isManager = role === "Manager";
  const isVisitor = role === "Visitor";

  const lototoCount = switchGears.filter((s) => s.status === "Aktif Lototo").length;
  const maintCount = switchGears.filter((s) => s.status === "Maintenance").length;

  const isAdmin = role === "Admin";

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (isVisitor && !["/dashboard", "/lototo", "/sg-maintenance", "/laporan-lototo"].includes(item.href)) return false;
    if ((isOperator || isSupervisor) && ["/pengguna", "/database-status"].includes(item.href)) return false;
    if (isManager && ["/pengguna", "/database-status"].includes(item.href)) return false;
    return true;
  });

  // Filter switchgear items based on role
  const filteredSwitchgear = SWITCHGEAR_ITEMS.filter((item) => {
    if (isVisitor) return true; // Visitor can see all switchgear items
    return true; // Other roles can see all switchgear items too
  });

  // Check if any switchgear item is active
  const isSwitchgearActive = filteredSwitchgear.some(item => pathname === item.href);
  // Auto-open switchgear group if a child is active
  const shouldShowSwitchgear = isSwitchgearActive || switchgearOpen;

  const navData = filteredNav.map((item) => {
    let badge: number | undefined;
    if ('badgeKey' in item && item.badgeKey === "lototo") badge = lototoCount || undefined;
    if ('badgeKey' in item && item.badgeKey === "maintenance") badge = maintCount || undefined;
    return { ...item, badge };
  });

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-white whitespace-nowrap transition-opacity duration-200">
            Distribusi Daya
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {/* Dashboard */}
        {navData.filter(item => item.href === "/dashboard").map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                ${isActive ? "bg-blue-600/20 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className={`whitespace-nowrap ${
                    item.glow === "red" ? "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)] font-bold" :
                    item.glow === "green" ? "text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)] font-bold" : ""
                  }`}>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md" />
              )}
            </Link>
          );
        })}

        {/* Laporan Switchgear Group */}
        {filteredSwitchgear.length > 0 && (
          <div>
            <button
              onClick={() => !collapsed && setSwitchgearOpen(!switchgearOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                ${shouldShowSwitchgear ? "bg-blue-600/20 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              <Lock size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="whitespace-nowrap">Switchgear</span>
                  <ChevronDown size={16} className={`ml-auto transition-transform ${shouldShowSwitchgear ? "rotate-180" : ""}`} />
                  {(lototoCount || 0) + (maintCount || 0) > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {(lototoCount || 0) + (maintCount || 0)}
                    </span>
                  )}
                </>
              )}
              {shouldShowSwitchgear && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md" />
              )}
            </button>
            {/* Submenu */}
            {shouldShowSwitchgear && !collapsed && (
              <div className="space-y-0.5 mt-0.5">
                {filteredSwitchgear.map((item) => {
                  const isSubActive = pathname === item.href;
                  let badge: number | undefined;
                  if (item.badgeKey === "lototo") badge = lototoCount || undefined;
                  if (item.badgeKey === "maintenance") badge = maintCount || undefined;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative
                        ${isSubActive ? "bg-blue-600/20 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span className={`whitespace-nowrap ${
                        item.glow === "red" ? "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)] font-bold" :
                        item.glow === "green" ? "text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)] font-bold" : ""
                      }`}>{item.label}</span>
                      {badge && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                      {isSubActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-md" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
            {/* Collapsed tooltip - show on hover when sidebar collapsed */}
            {collapsed && (
              <div className="relative group">
                <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-lg">
                  <div className="font-semibold mb-1">Switchgear</div>
                  {filteredSwitchgear.map((item) => (
                    <div key={item.href} className="flex items-center gap-2 py-0.5">
                      <item.icon size={12} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Other nav items (Laporan P2B, Pengguna, DB Status) */}
        {navData.filter(item => item.href !== "/dashboard").map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                ${isActive ? "bg-blue-600/20 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className={`whitespace-nowrap ${
                    item.glow === "red" ? "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)] font-bold" :
                    item.glow === "green" ? "text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)] font-bold" : ""
                  }`}>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md" />
              )}
            </Link>
          );
        })}
      </nav>

      {isAdmin && (
        <div className="px-3 pb-3">
          {/* Admin could have extra nav items here */}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-gray-900 text-white z-30 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white/60 hover:text-white z-10"
        >
          <ChevronLeft size={14} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={onMobileClose} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-screen bg-gray-900 text-white z-50 transition-transform duration-300 w-[260px] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button onClick={onMobileClose} className="absolute right-3 top-4 text-white/60 hover:text-white">
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
