// src/components/ComboChart.tsx
"use client";

import React from "react";
import { BarChart, LineChart } from "@tremor/react";

// Tipe untuk props komponen ComboChart
interface ComboChartProps {
  // --- PERBAIKAN: Mengganti 'any' dengan tipe yang lebih spesifik ---
  data: Record<string, string | number>[];
  index: string;
  barCategories: string[];
  lineCategories: string[];
  colors: ( "slate" | "gray" | "zinc" | "neutral" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose" )[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function ComboChart({
  data,
  index,
  barCategories,
  lineCategories,
  colors,
  valueFormatter,
  className,
}: ComboChartProps) {
  const barColors = colors.slice(0, barCategories.length);
  const lineColors = colors.slice(barCategories.length);

  return (
    <div className={`relative ${className}`}>
      {/* Lapisan 1: Bar Chart (grafik utama yang menggambar semua sumbu) */}
      <BarChart
        data={data}
        index={index}
        categories={barCategories}
        colors={barColors}
        valueFormatter={valueFormatter}
        yAxisWidth={80}
        showAnimation={true}
        stack={true}
        showLegend={true}
      />
      {/* Lapisan 2: Line Chart (ditumpuk di atas, hanya menggambar garis) */}
      <div className="absolute inset-0">
        <LineChart
          data={data}
          index={index}
          categories={lineCategories}
          colors={lineColors}
          valueFormatter={valueFormatter}
          // --- PERBAIKAN DI SINI ---
          showYAxis={false}       // Sembunyikan sumbu Y
          showXAxis={false}       // Sembunyikan sumbu X
          yAxisWidth={80}         // Tetap set agar lebarnya sama persis
          showAnimation={true}
          showLegend={false}      // Legenda sudah ada dari BarChart
          showGridLines={false}   // Hindari grid ganda
        />
      </div>
    </div>
  );
}