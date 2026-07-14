"use client";

import dynamic from "next/dynamic";

// Dynamic import untuk chart components agar tidak load di awal
// Ini mengurangi initial bundle size secara signifikan
export const DonutChart = dynamic(() => import("@/components/ui/DonutChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-40 bg-gray-50 rounded-xl">
      <div className="animate-pulse text-gray-400 text-sm">Loading chart...</div>
    </div>
  ),
});

export const LineChart = dynamic(() => import("@/components/ui/LineChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-40 bg-gray-50 rounded-xl">
      <div className="animate-pulse text-gray-400 text-sm">Loading chart...</div>
    </div>
  ),
});
