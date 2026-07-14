/**
 * Script backup users sebelum reset password
 * Jalankan dengan: node scripts/backup-users.js
 */

const { createClient } = require("@supabase/supabase-js");
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backup() {
  console.log("🔄 Memulai backup users...");
  
  const { data: users, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error("❌ Gagal backup:", error);
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-users-${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(users, null, 2));
  
  console.log(`✅ Backup berhasil: ${filename}`);
  console.log(`📊 Total ${users.length} user`);
  console.log("\nSimpan file ini dengan aman!");
}

backup();
