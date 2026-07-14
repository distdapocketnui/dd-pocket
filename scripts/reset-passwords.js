/**
 * Script reset password semua user ke password default
 * Jalankan dengan: node scripts/reset-passwords.js
 */

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    const value = valueParts.join("=").trim();
    if (value && !process.env[key.trim()]) {
      process.env[key.trim()] = value.replace(/^["']|["']$/g, "");
    }
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_PASSWORD = "password123"; // Password default untuk semua user
const SALT_ROUNDS = 12;

async function resetPasswords() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Supabase credentials tidak ditemukan.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🔄 Memulai reset password semua user...");
  console.log(`🔑 Password default: ${DEFAULT_PASSWORD}`);
  console.log("⚠️  User harus reset password setelah login pertama kali!\n");

  // Hash password default
  const hashedDefaultPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // Update semua user
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username");

  if (error) {
    console.error("❌ Gagal mengambil data user:", error);
    return;
  }

  console.log(`📋 Ditemukan ${users?.length || 0} user\n`);

  let updated = 0;

  for (const user of users || []) {
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedDefaultPassword })
      .eq("id", user.id);

    if (updateError) {
      console.error(`❌ Gagal reset user ${user.username}:`, updateError);
    } else {
      console.log(`✅ User ${user.username} direset ke password default`);
      updated++;
    }
  }

  console.log(`\n🎉 Reset selesai!`);
  console.log(`   Updated: ${updated} user`);
  console.log(`\n📝 Informasi:`);
  console.log(`   - Semua user sekarang punya password: ${DEFAULT_PASSWORD}`);
  console.log(`   - User harus reset password setelah login`);
  console.log(`   - Admin bisa reset password user di halaman Pengguna`);
}

resetPasswords().catch(console.error);
