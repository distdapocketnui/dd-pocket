"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { SwitchGear, User, ChangeApproval, UserRole } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { notifyAdminAfterApprovalRequest, notifyUserAfterReview, notifyDataChange } from "@/lib/notify-admin";

interface DataContextType {
  switchGears: SwitchGear[];
  users: User[];
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
    unit: row.unit || "",
    equipment: row.equipment || "",
    status: row.status,
    pic: row.pic || "",
    requester: row.requester || "",
    activeTime: row.active_time || "",
    finishTime: row.finish_time || "",
    notifNo: row.notif_no || "",
    lototoNo: row.lototo_no || "",
    image: row.image || "",
    images: row.images || "[]",
    description: row.description || "",
    alasan_stop: row.alasan_stop || "",
  };
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    unit: row.unit || "",
    department: row.department || "",
    username: row.username,
    password: row.password,
    role: row.role as UserRole,
    regu: row.regu || "",
    status: row.status,
    avatar_url: row.avatar_url || undefined,
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
    target_supervisor_id: row.target_supervisor_id ?? null,
    reviewed_by: row.reviewed_by,
    review_notes: row.review_notes || "",
    reason: row.reason || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [switchGears, setSwitchGears] = useState<SwitchGear[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [approvals, setApprovals] = useState<ChangeApproval[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const pendingApprovalCount = approvals.filter((a) => a.status === "pending").length;

  // ===== Initial data fetch =====
  const fetchAll = useCallback(async () => {
    const supabase = getSupabaseClient();
    try {
      const [sgRes, usersRes, approvalsRes] = await Promise.all([
        supabase.from("switch_gears").select("*").order("active_time", { ascending: false, nullsFirst: false }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("change_approvals").select("*").order("created_at", { ascending: false }),
      ]);

      if (sgRes.data) setSwitchGears(sgRes.data.map(mapSG));
      if (usersRes.data) setUsers(usersRes.data.map(mapUser));
      if (approvalsRes.data) setApprovals(approvalsRes.data.map(mapApproval));

      setDataReady(true);
      setInitialized(true);
    } catch (err) {
      logger.error('Failed to fetch initial data', err, { module: 'DataContext', action: 'fetchAll' });
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
  const addLog = useCallback(async (_action: string, _details: string, _page: string) => {
    // No-op: activity_logs sudah dihapus
  }, []);

  // ===== Switch Gear CRUD =====
  const addSwitchGear = useCallback(async (data: Omit<SwitchGear, "id">) => {
    try {
      const supabase = getSupabaseClient();
      const insertPayload: Record<string, any> = {
        name: data.name,
        location: data.location,
        unit: data.unit,
        equipment: data.equipment,
        status: data.status,
        pic: data.pic,
        requester: data.requester,
        active_time: data.activeTime,
        finish_time: data.finishTime,
        notif_no: data.notifNo,
        lototo_no: data.lototoNo,
        image: data.image,
        images: data.images,
        description: data.description,
        alasan_stop: data.alasan_stop,
      };
      const { data: inserted, error } = await supabase
        .from("switch_gears")
        .insert(insertPayload)
        .select()
        .single();

      if (error || !inserted) throw error || new Error("Insert failed");

      const mapped = mapSG(inserted);
      setSwitchGears(prev => [mapped, ...prev]);
      addLog("Tambah SG", `Menambahkan ${data.name}`, "Switch Gear");
      notifyDataChange({ title: "SG Baru", body: `${data.name} ditambahkan`, url: "/laporan-lototo" });
      return mapped;
    } catch (err) {
      logger.error('addSwitchGear error', err, { module: 'DataContext', action: 'addSwitchGear', name: data.name });
      return null;
    }
  }, [addLog]);


  const updateSwitchGear = useCallback(async (id: number, data: Partial<SwitchGear>) => {
    try {
      const supabase = getSupabaseClient();
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.pic !== undefined) updateData.pic = data.pic;
      if (data.requester !== undefined) updateData.requester = data.requester;
      if (data.activeTime !== undefined) updateData.active_time = data.activeTime;
      if (data.finishTime !== undefined) updateData.finish_time = data.finishTime;
      if (data.notifNo !== undefined) updateData.notif_no = data.notifNo;
      if (data.lototoNo !== undefined) updateData.lototo_no = data.lototoNo;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.images !== undefined) updateData.images = data.images;
      if (data.equipment !== undefined) updateData.equipment = data.equipment;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.alasan_stop !== undefined) updateData.alasan_stop = data.alasan_stop;

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
      notifyDataChange({ title: "SG Diubah", body: `${mapped.name} diubah`, url: "/laporan-lototo" });
      return mapped;
    } catch (err) {
      logger.error('updateSwitchGear error', err, { module: 'DataContext', action: 'updateSwitchGear', id });
      return null;
    }
  }, [addLog]);

  const deleteSwitchGear = useCallback(async (id: number) => {
    try {
      const supabase = getSupabaseClient();
      const item = switchGears.find(s => s.id === id);

      // Hapus file gambar dari Supabase Storage dulu (jika ada)
      if (item) {
        const imageUrls: string[] = [];
        try {
          const parsed = JSON.parse(item.images || "[]");
          if (Array.isArray(parsed)) imageUrls.push(...parsed);
        } catch {}
        if (item.image && !imageUrls.includes(item.image)) imageUrls.push(item.image);

        if (imageUrls.length > 0) {
          await fetch("/api/storage/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: imageUrls }),
          });
        }
      }

      const { error } = await supabase.from("switch_gears").delete().eq("id", id);
      if (error) throw error;

      setSwitchGears(prev => prev.filter(s => s.id !== id));
      if (item) {
        addLog("Hapus SG", `Menghapus ${item.name}`, "Switch Gear");
        notifyDataChange({ title: "SG Dihapus", body: `${item.name} dihapus`, url: "/laporan-lototo" });
      }
    } catch (err) {
      logger.error('deleteSwitchGear error', err, { module: 'DataContext', action: 'deleteSwitchGear', id });
    }
  }, [switchGears, addLog]);

  const getSwitchGear = useCallback((id: number) => {
    return switchGears.find(s => s.id === id);
  }, [switchGears]);

  // ===== User CRUD =====
  const addUser = useCallback(async (data: Omit<User, "id">) => {
    try {
      const supabase = getSupabaseClient();
      // Hash password sebelum disimpan
      const hashedPassword = await hashPassword(data.password);
      
      const { data: inserted, error } = await supabase
        .from("users")
        .insert({
          name: data.name,
          email: data.email,
          unit: data.unit,
          department: data.department,
          username: data.username,
          password: hashedPassword,
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
      logger.error('addUser error', err, { module: 'DataContext', action: 'addUser', name: data.name });
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
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.department !== undefined) updateData.department = data.department;
      if (data.username !== undefined) updateData.username = data.username;
      // Hash password jika ada perubahan password
      if (data.password !== undefined) {
        console.log('Hashing password in updateUser:', data.password.length > 0 ? '[HIDDEN]' : '(empty)');
        updateData.password = await hashPassword(data.password);
        console.log('Hashed password:', updateData.password.substring(0, 20) + '...');
      }
      if (data.role !== undefined) updateData.role = data.role;
      if (data.regu !== undefined) updateData.regu = data.regu;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;

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
      logger.error('updateUser error', err, { module: 'DataContext', action: 'updateUser', id });
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
      logger.error('deleteUser error', err, { module: 'DataContext', action: 'deleteUser', id });
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
    target_supervisor_id?: number | null;
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
          target_supervisor_id: data.target_supervisor_id ?? null,
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

      // Format timestamp
      const now = new Date();
      const timestamp = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Trigger push notification ke admin/supervisor
      notifyAdminAfterApprovalRequest({
        title: "Approval Baru",
        body: `${currentUser.name} meminta ${actionLabel.toLowerCase()} pada ${data.table_name} - ${timestamp}`,
        url: "/",
      });

      return mapped;
    } catch (err) {
      logger.error('createApproval error', err, { module: 'DataContext', action: 'createApproval' });
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
        } else if (tableName === "equipment_logs") {
          // Equipment logs table — map camelCase to snake_case, exclude non-DB fields
          const fieldMap: Record<string, string> = {
            equipment_id: "equipment_id",
            event_type: "event_type",
            timestamp: "timestamp",
            reason: "reason",
            shift: "shift",
            update_beban_pln: "update_beban_pln",
            update_beban_btg: "update_beban_btg",
            created_by: "created_by",
          };
          for (const [camel, snake] of Object.entries(fieldMap)) {
            if (approval.new_data[camel] !== undefined) {
              updatePayload[snake] = approval.new_data[camel];
            }
          }
          await supabase.from("equipment_logs").update(updatePayload).eq("id", approval.record_id);
        } else {
          // Switch gears table — map camelCase to snake_case
          const fieldMap: Record<string, string> = {
            name: "name", location: "location", unit: "unit", status: "status",
            pic: "pic", requester: "requester", activeTime: "active_time",
            finishTime: "finish_time",
            notifNo: "notif_no", lototoNo: "lototo_no", image: "image", description: "description",
            alasan_stop: "alasan_stop", equipment: "equipment",
          };

          for (const [camel, snake] of Object.entries(fieldMap)) {
            if (approval.new_data[camel] !== undefined) {
              updatePayload[snake] = approval.new_data[camel];
            }
          }
          await supabase.from("switch_gears").update(updatePayload).eq("id", approval.record_id);
        }
      } else if (approval.action_type === "delete") {
        const tableName = approval.table_name;

        // Hapus file gambar dari storage dulu jika tabel switch_gears
        if (tableName === "switch_gears") {
          const { data: toDelete } = await supabase
            .from("switch_gears")
            .select("image, images")
            .eq("id", approval.record_id)
            .single();

          if (toDelete) {
            const imageUrls: string[] = [];
            try {
              const parsed = JSON.parse(toDelete.images || "[]");
              if (Array.isArray(parsed)) imageUrls.push(...parsed);
            } catch {}
            if (toDelete.image && !imageUrls.includes(toDelete.image)) imageUrls.push(toDelete.image);

            if (imageUrls.length > 0) {
              await fetch("/api/storage/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ urls: imageUrls }),
              });
            }
          }
        }

        const targetTable = tableName === "users" ? "users" : tableName === "equipment_logs" ? "equipment_logs" : "switch_gears";
        await supabase.from(targetTable as "users" | "switch_gears" | "equipment_logs").delete().eq("id", approval.record_id);
      } else if (approval.action_type === "create" && approval.new_data) {
        console.log(">>> APPROVE CREATE:", { table: approval.table_name, new_data: approval.new_data });
        const tableName = approval.table_name;

        if (tableName === "users") {
          const { error: insertErr } = await supabase.from("users").insert(approval.new_data);
          if (insertErr) throw insertErr;
        } else if (tableName === "equipment_logs") {
          // Equipment logs table — map camelCase to snake_case, exclude non-DB fields
          const fieldMap: Record<string, string> = {
            equipment_id: "equipment_id",
            event_type: "event_type",
            timestamp: "timestamp",
            reason: "reason",
            shift: "shift",
            update_beban_pln: "update_beban_pln",
            update_beban_btg: "update_beban_btg",
            created_by: "created_by",
          };
          const insertPayload: Record<string, any> = {};
          for (const [camel, snake] of Object.entries(fieldMap)) {
            if (approval.new_data[camel] !== undefined) {
              insertPayload[snake] = approval.new_data[camel];
            }
          }
          const { error: insertErr } = await supabase
            .from("equipment_logs")
            .insert(insertPayload);
          if (insertErr) throw insertErr;
          console.log(">>> INSERT EQUIPMENT_LOG BERHASIL");
        } else {
          // Switch gears table — map camelCase to snake_case
          const fieldMap: Record<string, string> = {
            name: "name", location: "location", unit: "unit", status: "status",
            pic: "pic", requester: "requester", activeTime: "active_time",
            finishTime: "finish_time",
            notifNo: "notif_no", lototoNo: "lototo_no", image: "image", description: "description",
            alasan_stop: "alasan_stop", equipment: "equipment",
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

      // Format timestamp
      const now = new Date();
      const timestamp = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Format approver info with role
      const approverInfo = `${currentUser.name} (${currentUser.role})`;

      // Trigger push notification ke requester
      notifyUserAfterReview(approval.requested_by_name, {
        title: "Approval Disetujui",
        body: `${approverInfo} menyetujui permintaan ${approval.action_type} Anda - ${timestamp}`,
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
      logger.error('approveApproval error', err, { module: 'DataContext', action: 'approveApproval', approvalId: id });
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

      // Format timestamp
      const now = new Date();
      const timestamp = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Format approver info with role
      const approverInfo = `${currentUser.name} (${currentUser.role})`;

      // Trigger push notification ke requester
      notifyUserAfterReview(approval.requested_by_name, {
        title: "Approval Ditolak",
        body: `${approverInfo} menolak permintaan ${approval.action_type} Anda - ${timestamp}`,
        url: "/",
      });
    } catch (err) {
      logger.error('rejectApproval error', err, { module: 'DataContext', action: 'rejectApproval', approvalId: id });
    }
  }, [approvals, addLog]);

  return (
    <DataContext.Provider value={{
      switchGears, users, approvals, pendingApprovalCount, dataReady,
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
