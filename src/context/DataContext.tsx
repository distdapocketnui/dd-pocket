"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { SwitchGear, User, ActivityLog, ChangeApproval, UserRole } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { notifyAdminAfterApprovalRequest, notifyUserAfterReview, notifyDataChange } from "@/lib/notify-admin";

interface DataContextType {
  switchGears: SwitchGear[];
  users: User[];
  activityLogs: ActivityLog[];
  approvals: ChangeApproval[];
  pendingApprovalCount: number;
  dataReady: boolean;

  // Switch Gear CRUD
  addSwitchGear: (data: Omit<SwitchGear, "id">) => Promise<SwitchGear | null>;
  updateSwitchGear: (id: number, data: Partial<SwitchGear>) => Promise<SwitchGear | null>;
  deleteSwitchGear: (id: number) => Promise<void>;
  getSwitchGear: (id: number) => SwitchGear | undefined;

  // User CRUD
  addUser: (data: Omit<User, "id">) => Promise<User | null>;
  updateUser: (id: number, data: Partial<User>) => Promise<User | null>;
  deleteUser: (id: number) => Promise<void>;
  getUser: (id: number) => User | undefined;

  // Approval CRUD
  createApproval: (data: {
    table_name: string;
    record_id: number;
    action_type: "edit" | "delete" | "create";
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
  }) => Promise<ChangeApproval | null>;
  approveApproval: (id: number) => Promise<void>;
  rejectApproval: (id: number, notes?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helpers to map DB rows to app types
function mapSG(row: any): SwitchGear {
  return {
    id: row.id,
    name: row.name,
    location: row.location || "",
    area: row.area || "",
    status: row.status,
    pic: row.pic || "",
    requester: row.requester || "",
    activeTime: row.active_time || "",
    finishTime: row.finish_time || "",
    notifNo: row.notif_no || "",
    lototoNo: row.lototo_no || "",
    image: row.image || "",
    description: row.description || "",
  };
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    area: row.area || "",
    department: row.department || "",
    username: row.username,
    password: row.password,
    role: row.role as UserRole,
    regu: row.regu || "",
    status: row.status,
  };
}

function mapLog(row: any): ActivityLog {
  return {
    id: row.id,
    action: row.action,
    user: row.user,
    page: row.page || "",
    timestamp: row.timestamp || "",
    details: row.details || "",
  };
}

function mapApproval(row: any): ChangeApproval {
  return {
    id: row.id,
    table_name: row.table_name,
    record_id: row.record_id,
    action_type: row.action_type,
    old_data: row.old_data,
    new_data: row.new_data,
    regu: row.regu || "",
    status: row.status,
    requested_by: row.requested_by,
    requested_by_name: row.requested_by_name || "",
    reviewed_by: row.reviewed_by,
    review_notes: row.review_notes || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [switchGears, setSwitchGears] = useState<SwitchGear[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [approvals, setApprovals] = useState<ChangeApproval[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const pendingApprovalCount = approvals.filter((a) => a.status === "pending").length;

  // ===== Initial data fetch =====
  const fetchAll = useCallback(async () => {
    const supabase = getSupabaseClient();
    try {
      const [sgRes, usersRes, logsRes, approvalsRes] = await Promise.all([
        supabase.from("switch_gears").select("*").order("active_time", { ascending: false, nullsFirst: false }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("change_approvals").select("*").order("created_at", { ascending: false }),
      ]);

      if (sgRes.data) setSwitchGears(sgRes.data.map(mapSG));
      if (usersRes.data) setUsers(usersRes.data.map(mapUser));
      if (logsRes.data) setActivityLogs(logsRes.data.map(mapLog));
      if (approvalsRes.data) setApprovals(approvalsRes.data.map(mapApproval));

      setDataReady(true);
      setInitialized(true);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setDataReady(true);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ===== Auto-refresh every 30 seconds (realtime) =====
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const startPolling = () => {
      timer = setInterval(() => {
        fetchAll();
      }, 30000);
    };

    const stopPolling = () => {
      if (timer) clearInterval(timer);
    };

    // Only poll when tab is visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchAll(); // refresh immediately when returning
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Initial start
    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAll]);

  // ===== Activity Log Helper =====
  const addLog = useCallback(async (action: string, details: string, page: string) => {
    try {
      const stored = localStorage.getItem("ddp_current_user");
      const currentUser = stored ? JSON.parse(stored) : null;
      const userName = currentUser?.name || "System";
      const supabase = getSupabaseClient();
      const { data } = await supabase.from("activity_logs").insert({
        action,
        user: userName,
        page,
        timestamp: new Date().toLocaleString("id-ID", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        }),
        details: `${details} oleh ${userName}`,
      }).select().single();

      if (data) {
        setActivityLogs(prev => [mapLog(data), ...prev]);
      }
    } catch { /* silently fail */ }
  }, []);

  // ===== Switch Gear CRUD =====
  const addSwitchGear = useCallback(async (data: Omit<SwitchGear, "id">) => {
    try {
      const supabase = getSupabaseClient();
      const { data: inserted, error } = await supabase
        .from("switch_gears")
        .insert({
          name: data.name,
          location: data.location,
          area: data.area,
          status: data.status,
          pic: data.pic,
          requester: data.requester,
          active_time: data.activeTime,
          finish_time: data.finishTime,
          notif_no: data.notifNo,
          lototo_no: data.lototoNo,
          image: data.image,
          description: data.description,
        })
        .select()
        .single();

      if (error || !inserted) throw error || new Error("Insert failed");

      const mapped = mapSG(inserted);
      setSwitchGears(prev => [mapped, ...prev]);
      addLog("Tambah SG", `Menambahkan ${data.name}`, "Switch Gear");
      notifyDataChange({ title: "SG Baru", body: `${data.name} ditambahkan`, url: "/switch-gear" });
      return mapped;
    } catch (err) {
      console.error("addSwitchGear error:", err);
      return null;
    }
  }, [addLog]);

  const updateSwitchGear = useCallback(async (id: number, data: Partial<SwitchGear>) => {
    try {
      const supabase = getSupabaseClient();
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.area !== undefined) updateData.area = data.area;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.pic !== undefined) updateData.pic = data.pic;
      if (data.requester !== undefined) updateData.requester = data.requester;
      if (data.activeTime !== undefined) updateData.active_time = data.activeTime;
      if (data.finishTime !== undefined) updateData.finish_time = data.finishTime;
      if (data.notifNo !== undefined) updateData.notif_no = data.notifNo;
      if (data.lototoNo !== undefined) updateData.lototo_no = data.lototoNo;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.description !== undefined) updateData.description = data.description;

      const { data: updated, error } = await supabase
        .from("switch_gears")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error || !updated) throw error || new Error("Update failed");

      const mapped = mapSG(updated);
      setSwitchGears(prev => prev.map(s => s.id === id ? mapped : s));
      addLog("Edit SG", `Mengubah data ${mapped.name}`, "Switch Gear");
      notifyDataChange({ title: "SG Diubah", body: `${mapped.name} diubah`, url: "/switch-gear" });
      return mapped;
    } catch (err) {
      console.error("updateSwitchGear error:", err);
      return null;
    }
  }, [addLog]);

  const deleteSwitchGear = useCallback(async (id: number) => {
    try {
      const supabase = getSupabaseClient();
      const item = switchGears.find(s => s.id === id);
      const { error } = await supabase.from("switch_gears").delete().eq("id", id);
      if (error) throw error;

      setSwitchGears(prev => prev.filter(s => s.id !== id));
      if (item) {
        addLog("Hapus SG", `Menghapus ${item.name}`, "Switch Gear");
        notifyDataChange({ title: "SG Dihapus", body: `${item.name} dihapus`, url: "/switch-gear" });
      }
    } catch (err) {
      console.error("deleteSwitchGear error:", err);
    }
  }, [switchGears, addLog]);

  const getSwitchGear = useCallback((id: number) => {
    return switchGears.find(s => s.id === id);
  }, [switchGears]);

  // ===== User CRUD =====
  const addUser = useCallback(async (data: Omit<User, "id">) => {
    try {
      const supabase = getSupabaseClient();
      const { data: inserted, error } = await supabase
        .from("users")
        .insert({
          name: data.name,
          email: data.email,
          area: data.area,
          department: data.department,
          username: data.username,
          password: data.password,
          role: data.role,
          regu: data.regu || "",
          status: data.status,
        })
        .select()
        .single();

      if (error || !inserted) throw error || new Error("Insert failed");

      const mapped = mapUser(inserted);
      setUsers(prev => [mapped, ...prev]);
      addLog("Tambah User", `Menambahkan user baru: ${data.name}`, "Pengguna");
      notifyDataChange({ title: "User Baru", body: `User ${data.name} ditambahkan`, url: "/pengguna" });
      return mapped;
    } catch (err) {
      console.error("addUser error:", err);
      return null;
    }
  }, [addLog]);

  const updateUser = useCallback(async (id: number, data: Partial<User>) => {
    try {
      const supabase = getSupabaseClient();
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.area !== undefined) updateData.area = data.area;
      if (data.department !== undefined) updateData.department = data.department;
      if (data.username !== undefined) updateData.username = data.username;
      if (data.password !== undefined) updateData.password = data.password;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.regu !== undefined) updateData.regu = data.regu;
      if (data.status !== undefined) updateData.status = data.status;

      const { data: updated, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error || !updated) throw error || new Error("Update failed");

      const mapped = mapUser(updated);
      setUsers(prev => prev.map(u => u.id === id ? mapped : u));
      addLog("Edit User", `Mengubah data user: ${mapped.name}`, "Pengguna");
      notifyDataChange({ title: "User Diubah", body: `User ${mapped.name} diubah`, url: "/pengguna" });

      // If the updated user is the current logged-in user, refresh auth state
      const stored = localStorage.getItem("ddp_current_user");
      if (stored) {
        const current = JSON.parse(stored);
        if (current.id === id) {
          localStorage.setItem("ddp_current_user", JSON.stringify(mapped));
        }
      }

      return mapped;
    } catch (err) {
      console.error("updateUser error:", err);
      return null;
    }
  }, [addLog]);

  const deleteUser = useCallback(async (id: number) => {
    try {
      const supabase = getSupabaseClient();
      const item = users.find(u => u.id === id);
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== id));
      if (item) {
        addLog("Hapus User", `Menghapus user: ${item.name}`, "Pengguna");
        notifyDataChange({ title: "User Dihapus", body: `User ${item.name} dihapus`, url: "/pengguna" });
      }
    } catch (err) {
      console.error("deleteUser error:", err);
    }
  }, [users, addLog]);

  const getUser = useCallback((id: number) => {
    return users.find(u => u.id === id);
  }, [users]);

  // ===== Approval CRUD =====
  const createApproval = useCallback(async (data: {
    table_name: string;
    record_id: number;
    action_type: "edit" | "delete" | "create";
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
  }) => {
    try {
      const stored = localStorage.getItem("ddp_current_user");
      const currentUser = stored ? JSON.parse(stored) : null;
      if (!currentUser) return null;

      const supabase = getSupabaseClient();
      const { data: inserted, error } = await supabase
        .from("change_approvals")
        .insert({
          table_name: data.table_name,
          record_id: data.record_id,
          action_type: data.action_type,
          old_data: data.old_data,
          new_data: data.new_data,
          status: "pending",
          requested_by: currentUser.id,
          requested_by_name: currentUser.name,
          regu: currentUser.regu || "",
        })
        .select()
        .single();

      if (error || !inserted) throw error || new Error("Insert failed");

      const mapped = mapApproval(inserted);
      setApprovals(prev => [mapped, ...prev]);

      const actionLabel = data.action_type === "edit" ? "Edit" : data.action_type === "delete" ? "Hapus" : "Tambah";
      addLog(
        `Request ${actionLabel}`,
        `Operator ${currentUser.name} meminta ${actionLabel.toLowerCase()} pada ${data.table_name} #${data.record_id}`,
        "Approval"
      );

      // Trigger push notification ke admin/supervisor
      notifyAdminAfterApprovalRequest({
        title: "Approval Baru",
        body: `${currentUser.name} meminta ${actionLabel.toLowerCase()} pada ${data.table_name}`,
        url: "/",
      });

      return mapped;
    } catch (err) {
      console.error("createApproval error:", err);
      return null;
    }
  }, [addLog]);

  const approveApproval = useCallback(async (id: number) => {
    try {
      const stored = localStorage.getItem("ddp_current_user");
      const currentUser = stored ? JSON.parse(stored) : null;
      if (!currentUser) return;

      const approval = approvals.find(a => a.id === id);
      if (!approval) return;

      const supabase = getSupabaseClient();

      // Execute the actual change based on action_type
      if (approval.action_type === "edit" && approval.new_data) {
        const updatePayload: any = {};
        const tableName = approval.table_name;

        if (tableName === "users") {
          // Users table — fields match directly (password, name, email, etc.)
          for (const [key, value] of Object.entries(approval.new_data)) {
            if (value !== undefined) updatePayload[key] = value;
          }
          await supabase.from("users").update(updatePayload).eq("id", approval.record_id);
        } else {
          // Switch gears table — map camelCase to snake_case
          const fieldMap: Record<string, string> = {
            name: "name", location: "location", unit: "unit", status: "status",
            pic: "pic", requester: "requester", activeTime: "active_time",
            finishTime: "finish_time",
            notifNo: "notif_no", lototoNo: "lototo_no", image: "image", description: "description",
          };

          for (const [camel, snake] of Object.entries(fieldMap)) {
            if (approval.new_data[camel] !== undefined) {
              updatePayload[snake] = approval.new_data[camel];
            }
          }
          await supabase.from("switch_gears").update(updatePayload).eq("id", approval.record_id);
        }
      } else if (approval.action_type === "delete") {
        const tableName = approval.table_name === "users" ? "users" : "switch_gears";
        await supabase.from(tableName as "users" | "switch_gears").delete().eq("id", approval.record_id);
      } else if (approval.action_type === "create" && approval.new_data) {
        console.log(">>> APPROVE CREATE:", { table: approval.table_name, new_data: approval.new_data });
        const tableName = approval.table_name === "users" ? "users" : "switch_gears";

        if (tableName === "users") {
          const { error: insertErr } = await supabase.from("users").insert(approval.new_data);
          if (insertErr) throw insertErr;
        } else {
          // Switch gears table — map camelCase to snake_case
          const fieldMap: Record<string, string> = {
            name: "name", location: "location", unit: "unit", status: "status",
            pic: "pic", requester: "requester", activeTime: "active_time",
            finishTime: "finish_time",
            notifNo: "notif_no", lototoNo: "lototo_no", image: "image", description: "description",
          };
          const insertPayload: Record<string, any> = {};
          for (const [camel, snake] of Object.entries(fieldMap)) {
            if (approval.new_data[camel] !== undefined) {
              insertPayload[snake] = approval.new_data[camel];
            }
          }
          console.log(">>> INSERT PAYLOAD:", insertPayload);
          // Pakai tanpa .select().single() dulu untuk kompatibilitas Safari
          const { error: insertErr } = await supabase
            .from("switch_gears")
            .insert(insertPayload);
          if (insertErr) throw insertErr;
          console.log(">>> INSERT BERHASIL");
        }
      } else {
        console.log(">>> APPROVAL TIDAK MASUK BRANCH CREATE:", {
          action_type: approval.action_type,
          has_new_data: !!approval.new_data,
          new_data_value: approval.new_data
        });
      }

      // Update approval status
      const { data: updated, error } = await supabase
        .from("change_approvals")
        .update({ status: "approved", reviewed_by: currentUser.id })
        .eq("id", id)
        .select()
        .single();

      if (error || !updated) throw error || new Error("Update failed");

      setApprovals(prev => prev.map(a => a.id === id ? mapApproval(updated) : a));
      addLog(
        "Approval Disetujui",
        `${currentUser.name} menyetujui ${approval.action_type} pada ${approval.table_name} #${approval.record_id}`,
        "Approval"
      );

      // Refresh data to get latest
      fetchAll();

      // Trigger push notification ke requester
      notifyUserAfterReview(approval.requested_by_name, {
        title: "Approval Disetujui",
        body: `${currentUser.name} menyetujui permintaan ${approval.action_type} Anda`,
        url: "/",
      });

      // If the approved change affected the current logged-in user, sync session storage
      if (approval.table_name === "users" && approval.record_id && currentUser) {
        const stored = localStorage.getItem("ddp_current_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.id === approval.record_id) {
            const { data: freshUser } = await supabase
              .from("users")
              .select("*")
              .eq("id", approval.record_id)
              .single();
            if (freshUser) {
              const mapped = mapUser(freshUser);
              localStorage.setItem("ddp_current_user", JSON.stringify(mapped));
            }
          }
        }
      }
    } catch (err) {
      console.error("approveApproval error:", err);
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat menyetujui";
      alert("Gagal menyetujui: " + message);
    }
  }, [approvals, addLog, fetchAll]);

  const rejectApproval = useCallback(async (id: number, notes?: string) => {
    try {
      const stored = localStorage.getItem("ddp_current_user");
      const currentUser = stored ? JSON.parse(stored) : null;
      if (!currentUser) return;

      const approval = approvals.find(a => a.id === id);
      if (!approval) return;

      const supabase = getSupabaseClient();
      const { data: updated, error } = await supabase
        .from("change_approvals")
        .update({ status: "rejected", reviewed_by: currentUser.id, review_notes: notes || "" })
        .eq("id", id)
        .select()
        .single();

      if (error || !updated) throw error || new Error("Update failed");

      setApprovals(prev => prev.map(a => a.id === id ? mapApproval(updated) : a));
      addLog(
        "Approval Ditolak",
        `${currentUser.name} menolak ${approval.action_type} pada ${approval.table_name} #${approval.record_id}${notes ? `: ${notes}` : ""}`,
        "Approval"
      );

      // Trigger push notification ke requester
      notifyUserAfterReview(approval.requested_by_name, {
        title: "Approval Ditolak",
        body: `${currentUser.name} menolak permintaan ${approval.action_type} Anda`,
        url: "/",
      });
    } catch (err) {
      console.error("rejectApproval error:", err);
    }
  }, [approvals, addLog]);

  return (
    <DataContext.Provider value={{
      switchGears, users, activityLogs, approvals, pendingApprovalCount, dataReady,
      addSwitchGear, updateSwitchGear, deleteSwitchGear, getSwitchGear,
      addUser, updateUser, deleteUser, getUser,
      createApproval, approveApproval, rejectApproval,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
