"use client";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;
let initialized = false;

type InitCallback = () => void;
const initCallbacks: InitCallback[] = [];

/** Inisialisasi Google Identity Services — panggil sekali di awal */
export function initGoogleDrive(clientId: string): Promise<void> {
  return new Promise((resolve) => {
    if (initialized) { resolve(); return; }

    // Tunggu GIS library siap
    const check = () => {
      if (typeof google !== "undefined" && google.accounts) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (response) => {
            if (response.access_token) {
              accessToken = response.access_token;
            }
          },
        });
        initialized = true;
        initCallbacks.forEach((cb) => cb());
        initCallbacks.length = 0;
        resolve();
      } else {
        setTimeout(check, 200);
      }
    };

    // Load GIS library jika belum ada
    if (!document.querySelector('script[src*="gsi/client"]')) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = check;
      document.head.appendChild(script);
    } else {
      check();
    }
  });
}

/** Minta akses token Google Drive (muncul popup auth) */
export function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (accessToken) {
      resolve(accessToken);
      return;
    }

    if (!tokenClient) {
      reject(new Error("Google Identity Services belum diinisialisasi"));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.access_token) {
        accessToken = response.access_token;
        resolve(accessToken);
      } else {
        reject(new Error(response.error || "Gagal mendapatkan token"));
      }
    };
    tokenClient.requestAccessToken();
  });
}

/** Upload file base64 ke Google Drive, return URL view */
export async function uploadToGoogleDrive(
  base64DataUrl: string,
  fileName: string,
): Promise<string> {
  const token = await requestAccessToken();

  // Konversi base64 data URL ke Blob
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();

  const formData = new FormData();
  formData.append("metadata", new Blob(
    [JSON.stringify({ name: fileName })],
    { type: "application/json" },
  ));
  formData.append("file", blob);

  // Upload file
  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gagal upload ke Google Drive: ${err}`);
  }

  const { id: fileId, webViewLink } = await uploadRes.json();

  // Set permission: Anyone with link can view
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  );

  return webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
}
