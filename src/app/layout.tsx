import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PwaSetup from "@/components/PwaSetup";
import PasswordResetModal from "@/components/PasswordResetModal";

export const metadata: Metadata = {
  title: "Distribusi Daya — Monitoring LOTOTO",
  description: "Monitoring pengamanan switch gear dan status LOTOTO",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DD-Pocket",
    statusBarStyle: "default",
  },
  icons: {
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
      </head>
      <body className="scrollbar-thin">
        <PwaSetup />
        <AuthProvider>
          <DataProvider>
            <ErrorBoundary>
              {children}
              <PasswordResetModal />
            </ErrorBoundary>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
