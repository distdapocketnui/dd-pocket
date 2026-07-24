"use client";

import { useEffect, useRef } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Props {
  labels: string[];
  data: number[] | number[][];
  label?: string | string[];
  colors?: string[];
}

const DEFAULT_COLORS = [
  "rgba(59, 130, 246, 0.8)",
  "rgba(16, 185, 129, 0.8)",
  "rgba(245, 158, 11, 0.8)",
];

export default function BarChart({ labels, data, label = "Jumlah", colors = DEFAULT_COLORS }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"bar"> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Handle both single and multiple datasets
    const datasets = Array.isArray(data[0])
      ? (data as number[][]).map((dataset, idx) => ({
          label: Array.isArray(label) ? label[idx] : `${label} ${idx + 1}`,
          data: dataset,
          backgroundColor: colors[idx] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          borderColor: (colors[idx] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]).replace("0.8", "1"),
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6,
        }))
      : [
          {
            label: Array.isArray(label) ? label[0] : label,
            data: data as number[],
            backgroundColor: colors,
            borderColor: colors.map((c) => c.replace("0.8", "1")),
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6,
          },
        ];

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: { size: 12 },
              boxWidth: 16,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: "#1f2937",
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { size: 11 },
            },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [labels, data, label, colors]);

  if (!labels.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Belum ada data
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <canvas ref={canvasRef} />
    </div>
  );
}
