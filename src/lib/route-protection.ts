export const ROUTE_ACCESS: Record<string, string[]> = {
  "/equipment-logs": ["Admin", "Supervisor", "Operator", "Manager"],
  "/laporan-p2b": ["Admin", "Supervisor", "Operator", "Manager"],
  "/pengguna": ["Admin"],
  "/database-status": ["Admin"],
  "/sg-maintenance": ["Admin", "Supervisor", "Operator"],
  "/lototo": ["Admin", "Supervisor", "Operator"],
  "/lap-operasi-harian": ["Admin", "Supervisor", "Operator", "Manager"],
  "/lap-operasi-bulanan": ["Admin", "Supervisor", "Operator", "Manager"],
  "/dashboard": ["Admin", "Supervisor", "Operator", "Manager"],
  "/profil": ["Admin", "Supervisor", "Operator", "Manager"],
};

export function canAccessRoute(pathname: string, role: string | undefined): boolean {
  if (!role) return false;
  
  // Cek exact match
  const allowedRoles = ROUTE_ACCESS[pathname];
  if (allowedRoles) {
    return allowedRoles.includes(role);
  }
  
  // Default: allow access untuk role non-Visitor
  return role !== "Visitor";
}
