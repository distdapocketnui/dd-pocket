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
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        <Calendar size={14} /> Filter Tanggal
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <span className="text-xs text-gray-400">—</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
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
            onClick={onDownloadPdf}
            className="ml-auto p-2 sm:px-3 sm:py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}
