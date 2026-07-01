"use client";

import { useEffect } from "react";

/**
 * PWA Setup — registrasi service worker (client-side only).
 * Dipisah dari layout agar tidak kena hydration mismatch.
 */
export default function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });
    }
  }, []);

  return null;
}
