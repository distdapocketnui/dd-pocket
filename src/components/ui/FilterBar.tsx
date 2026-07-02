"use client";

import { useState } from "react";
import { Calendar, Download } from "lucide-react";

interface Props {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onDownloadPdf: () => void;
  showDownload?: boolean;
}

export default function FilterBar({ startDate, endDate, onStartDateChange, onEndDateChange, onDownloadPdf, showDownload = true }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownloadClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmOk = () => {
    setShowConfirm(false);
    onDownloadPdf();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 shrink-0">
          <Calendar size={14} /> Filter Tanggal
        </div>
        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="w-full grid grid-cols-2 sm:flex sm:items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {(startDate || endDate) && (
              <button
                onClick={() => { onStartDateChange(""); onEndDateChange(""); }}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
            {showDownload && (
              <button
                onClick={handleDownloadClick}
                className="w-full sm:w-auto p-2 sm:px-3 sm:py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Download */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Konfirmasi Download</h3>
            <p className="text-sm text-gray-500 mb-6">Apakah data yang ingin di download sudah benar?</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOk}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
