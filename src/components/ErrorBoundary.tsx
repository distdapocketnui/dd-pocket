"use client";

import { Component, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught error', error, {
      module: 'ErrorBoundary',
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = () => {
    // Clear localStorage on reset to recover from bad state
    localStorage.removeItem("ddp_current_user");
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-gray-500 text-center mb-4">
              Aplikasi mengalami error saat memuat. Silakan coba lagi.
            </p>
            {err && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-xs font-mono text-gray-600 break-all max-h-32 overflow-y-auto border border-gray-100">
                <p className="font-semibold text-gray-800 mb-1">{err.name}:</p>
                <p>{err.message}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Detail teknis</summary>
                  <p className="mt-1 text-gray-400 whitespace-pre-wrap">{err.stack}</p>
                </details>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mb-4">
              Coba buka Chrome ➔ ⋮ ➔ Site settings ➔ Clear & reset, lalu buka lagi.
            </p>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Mulai Ulang
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Refresh Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
