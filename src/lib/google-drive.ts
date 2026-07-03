/**
 * Upload gambar ke Google Drive via server-side API route.
 * Tidak perlu login Google — auth dikelola server dengan Service Account.
 */

/** Tidak perlu inisialisasi apa pun — server yang urus auth */
export async function initGoogleDrive(_clientId?: string): Promise<void> {
  // No-op: auth dikelola server-side via Service Account
  return;
}

/**
 * Upload file base64 ke server, yang akan meneruskannya ke Google Drive
 */
export async function uploadToGoogleDrive(
  base64DataUrl: string,
  fileName: string,
): Promise<string> {
  // Konversi base64 data URL ke Blob/File
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: "image/jpeg" });

  const formData = new FormData();
  formData.append("file", file);

  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({ error: "Gagal upload" }));
    throw new Error(err.error || "Gagal upload gambar");
  }

  const { url } = await uploadRes.json();
  return url;
}
