"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Lock, Wrench, Server, FileText, History, Users, ChevronLeft, X, Database,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getInitials } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lototo", label: "Lototo", icon: Lock, badgeKey: "lototo" },
  { href: "/sg-maintenance", label: "SG Maintenance", icon: Wrench, badgeKey: "maintenance" },
  { href: "/switch-gear", label: "Switch Gear", icon: Server },
  { href: "/laporan-harian", label: "Laporan Harian", icon: FileText },
  { href: "/aktivitas-log", label: "Aktifitas Log", icon: History },
  { href: "/pengguna", label: "Pengguna", icon: Users },
  { href: "/database-status", label: "DB Status", icon: Database },
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

  const role = user?.role;
  const isOperator = role === "Operator";
  const isManager = role === "Manager";
  const isVisitor = role === "Visitor";

  const lototoCount = switchGears.filter((s) => s.status === "Aktif Lototo").length;
  const maintCount = switchGears.filter((s) => s.status === "Maintenance").length;

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (isVisitor && !["/dashboard", "/lototo", "/sg-maintenance", "/switch-gear"].includes(item.href)) return false;
    if (isOperator && ["/aktivitas-log", "/pengguna", "/database-status"].includes(item.href)) return false;
    if (isManager && ["/pengguna", "/database-status"].includes(item.href)) return false;
    return true;
  });

  const navData = filteredNav.map((item) => {
    let badge: number | undefined;
    if (item.badgeKey === "lototo") badge = lototoCount || undefined;
    if (item.badgeKey === "maintenance") badge = maintCount || undefined;
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
        {navData.map((item) => {
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
                  <span className="whitespace-nowrap">{item.label}</span>
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
