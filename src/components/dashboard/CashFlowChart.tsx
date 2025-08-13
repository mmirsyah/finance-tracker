// src/components/dashboard/CashFlowChart.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, Title, BarChart } from '@tremor/react';
import { format } from 'date-fns';

// --- PERBAIKAN: Mendefinisikan tipe data untuk hasil RPC ---
type MonthlyCashFlow = {
  month_start: string;
  total_income: number;
  total_expense: number;
};

type CashFlowItem = {
  date: string;
  Pemasukan: number;
  Pengeluaran: number;
};

const formatNumberShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(value) >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  if (Math.abs(value) >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} rb`;
  return `Rp ${value.toString()}`;
};

const SkeletonChartCard = () => (
  <Card>
    <div className="h-6 w-1/2 bg-gray-200 rounded mb-6 animate-pulse"></div>
    <div className="h-72 bg-gray-200 rounded animate-pulse"></div>
  </Card>
);

interface CashFlowChartProps {
  startDate: string;
  // --- PERBAIKAN: Menghapus prop 'endDate' yang tidak digunakan ---
}

export default function CashFlowChart({ startDate }: CashFlowChartProps) {
  const { user, dataVersion } = useAppData();
  const [cashFlowData, setCashFlowData] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCashFlow = async () => {
      if (!user || !startDate) return;
      setLoading(true);

      const { data, error } = await supabase.rpc('get_monthly_cash_flow_v2', {
        p_user_id: user.id,
        p_start_date: startDate,
      });

      if (error) {
        console.error("Error fetching cash flow data:", error);
        setCashFlowData([]);
      } else if (data) {
        // --- PERBAIKAN: Menggunakan tipe MonthlyCashFlow yang sudah didefinisikan ---
        const formattedData = data.map((item: MonthlyCashFlow) => ({
          date: format(new Date(item.month_start), 'MMM yy'),
          Pemasukan: item.total_income,
          Pengeluaran: item.total_expense,
        }));
        setCashFlowData(formattedData);
      }
      setLoading(false);
    };

    fetchCashFlow();
  }, [user, startDate, dataVersion]);

  if (loading) {
    return <SkeletonChartCard />;
  }

  return (
    <Card>
      <Title>Cash Flow Over Time</Title>      <BarChart
        className="mt-6 h-72"
        data={cashFlowData}
        index="date"
        categories={['Pemasukan', 'Pengeluaran']}
        colors={['green', 'red']}
        valueFormatter={formatNumberShort}
        yAxisWidth={60}
        noDataText="Not enough data for the selected period."
      />
    </Card>
  );
}