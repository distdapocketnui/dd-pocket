"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * PWA Setup — registrasi service worker (client-side only).
 * Dipisah dari layout agar tidak kena hydration mismatch.
 */
export default function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        logger.warn('[PWA] Service worker registration failed', err);
      });
    }
  }, []);

  return null;
}
