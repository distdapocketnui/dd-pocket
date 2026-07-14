/**
 * Script migrasi password - hash semua password user yang masih plain text
 * Jalankan dengan: npx tsx scripts/migrate-passwords.ts
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SALT_ROUNDS = 12;

async function migratePasswords() {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🔐 Memulai migrasi password...");

  // Ambil semua user
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, password");

  if (error) {
    console.error("❌ Gagal mengambil data user:", error);
    return;
  }

  console.log(`📋 Ditemukan ${users?.length || 0} user`);

  let updated = 0;
  let skipped = 0;

  for (const user of users || []) {
    // Cek apakah password sudah ter-hash (dimulai dengan $2a$, $2b$, atau $2y$)
    if (user.password.startsWith("$2")) {
      console.log(`✓ User ${user.username} sudah ter-hash, skip`);
      skipped++;
      continue;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

    // Update ke database
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", user.id);

    if (updateError) {
      console.error(`❌ Gagal update user ${user.username}:`, updateError);
    } else {
      console.log(`✅ User ${user.username} berhasil di-hash`);
      updated++;
    }
  }

  console.log(`\n🎉 Migrasi selesai!`);
  console.log(`   Updated: ${updated} user`);
  console.log(`   Skipped: ${skipped} user (sudah ter-hash)`);
}

migratePasswords().catch(console.error);
