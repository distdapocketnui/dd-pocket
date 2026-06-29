import { SGStatus, UserRole, UserStatus } from "@/types";

export function statusBadgeClass(status: SGStatus): string {
  const map: Record<SGStatus, string> = {
    "Aktif Lototo": "bg-red-50 text-red-700 border-red-200",
    Maintenance: "bg-amber-50 text-amber-700 border-amber-200",
    Selesai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return map[status];
}

export function statusDotClass(status: SGStatus): string {
  const map: Record<SGStatus, string> = {
    "Aktif Lototo": "bg-red-600",
    Maintenance: "bg-amber-600",
    Selesai: "bg-emerald-600",
  };
  return map[status];
}

export function roleBadgeClass(role: UserRole): string {
  const map: Record<UserRole, string> = {
    Admin: "bg-purple-50 text-purple-700",
    Manager: "bg-blue-50 text-blue-700",
    Operator: "bg-emerald-50 text-emerald-700",
    Visitor: "bg-gray-50 text-gray-700",
  };
  return map[role];
}

export function statusUserBadgeClass(status: UserStatus): string {
  const map: Record<UserStatus, string> = {
    Aktif: "bg-red-50 text-red-700 border-red-200",
    Nonaktif: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[status];
}

export function statusUserDotClass(status: UserStatus): string {
  const map: Record<UserStatus, string> = {
    Aktif: "bg-red-600",
    Nonaktif: "bg-amber-600",
  };
  return map[status];
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(date: Date): string {
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
