"use client";

import { useEffect, useRef } from "react";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

function LegendBars({ values, total }: { values: number[]; total: number }) {
  const pcts = values.map((v) => ((v / total) * 100).toFixed(1));

  return (
    <div className="chart-legend flex flex-col gap-3">
      {LABELS.map((label, i) => (
        <div key={label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
              <span className="font-medium text-gray-700">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{values[i]}</span>
              <span className="text-gray-400 text-[11px]">{pcts[i]}%</span>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pcts[i]}%`, backgroundColor: COLORS[i] }} />
          </div>
        </div>
      ))}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">Total</span>
          <span className="text-base font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  aktif: number;
  maintenance: number;
  selesai: number;
  mode?: "full" | "chart" | "legend" | "combined";
}

const COLORS = ["#ef4444", "#f59e0b", "#10b981"];
const LABELS = ["Aktif Lototo", "Maintenance", "Selesai"];

export default function DonutChart({ aktif, maintenance, selesai, mode = "full" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"doughnut"> | null>(null);
  const total = aktif + maintenance + selesai || 1;
  const values = [aktif, maintenance, selesai];

  useEffect(() => {
    if (mode === "legend") return;
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: LABELS,
        datasets: [{
          data: values,
          backgroundColor: COLORS,
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1f2937",
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw as number;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${val} (${pct}%)`;
              },
            },
          },
        },
      },
      plugins: [{
        id: "centerText",
        beforeDraw(chart) {
          const { width, height, ctx: c } = chart;
          c.save();
          const cx = width / 2;
          const cy = height / 2;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.font = "bold 28px Inter, sans-serif";
          c.fillStyle = "#111827";
          c.fillText(String(total), cx, cy - 6);
          c.font = "11px Inter, sans-serif";
          c.fillStyle = "#6b7280";
          c.fillText("Total SG", cx, cy + 16);
          c.restore();
        },
      }],
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [aktif, maintenance, selesai, total, mode]);

  if (mode === "chart") {
    return (
      <div className="donut-wrapper flex items-center justify-center">
        <div className="relative w-[160px] h-[160px] sm:w-[190px] sm:h-[190px]">
          <canvas ref={canvasRef} />
        </div>
      </div>
    );
  }

  if (mode === "legend") {
    return <LegendBars values={values} total={total} />;
  }

  if (mode === "combined") {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
        <div className="donut-wrapper flex-shrink-0">
          <div className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] lg:w-[180px] lg:h-[180px]">
            <canvas ref={canvasRef} />
          </div>
        </div>
        <div className="flex-1 w-full max-w-[320px]">
          <LegendBars values={values} total={total} />
        </div>
      </div>
    );
  }

  // mode === "full" (default, backward compatible)

  // mode === "full" (default, backward compatible)
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6">
      <div className="relative w-[160px] h-[160px] sm:w-[190px] sm:h-[190px]">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex flex-col gap-2.5">
        {LABELS.map((label, i) => {
          return (
            <div key={label} className="flex items-center gap-3 text-sm text-gray-600">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[i] }}
              />
              <span>{label}</span>
              <span className="font-semibold text-gray-900 ml-4">{values[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
