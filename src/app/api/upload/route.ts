import { NextRequest, NextResponse } from "next/server";
import { uploadToStorage } from "@/lib/storage-server";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

/**
 * POST /api/upload
 * Menerima file gambar dari client, upload ke Supabase Storage bucket "images".
 *
 * Input: FormData dengan field "file"
 * Output: { url: string }
 */
export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const formData = await request.formData();
    file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 },
      );
    }

    // Validasi tipe file — hanya gambar
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Hanya file gambar yang diizinkan" },
        { status: 400 },
      );
    }

    // Validasi ukuran (maks 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File terlalu besar, maksimal 5MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Pakai timestamp agar nama file unik
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}-${safeName}`;

    // Upload ke Supabase Storage
    const url = await uploadToStorage(buffer, fileName, file.type);

    return NextResponse.json({ url });
  } catch (error: any) {
    logger.error('[Upload] Error uploading file', error, { fileName: file?.name });
    return NextResponse.json(
      { error: error?.message || "Gagal upload gambar" },
      { status: 500 },
    );
  }
}
