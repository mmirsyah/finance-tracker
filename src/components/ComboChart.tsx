// src/components/ComboChart.tsx
"use client";

import React from "react";
import { BarChart, LineChart } from "@tremor/react";

// Tipe untuk props komponen ComboChart
interface ComboChartProps {
  // --- PERBAIKAN: Menggunakan tipe yang lebih spesifik daripada 'any' ---
  data: Record<string, any>[];
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
      <LineChart
        data={data}
        index={index}
        categories={lineCategories}
        colors={lineColors}
        valueFormatter={valueFormatter}
        yAxisWidth={80}
        showAnimation={true}
        showLegend={false}
      />
      <div className="absolute inset-0">
        <BarChart
          data={data}
          index={index}
          categories={barCategories}
          colors={barColors}
          valueFormatter={valueFormatter}
          yAxisWidth={80}
          showAnimation={true}
          stack={true}
          showGridLines={false}
          showLegend={true}
        />
      </div>
    </div>
  );
}