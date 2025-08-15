// src/components/dashboard/CashFlowChart.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/contexts/AppDataContext';
// --- PERBAIKAN: IMPORT TIPE DATA DARI TREMOR ---
import { Card, Title, BarChart, Text, Flex, CustomTooltipProps } from '@tremor/react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type IntervalType = 'auto' | 'day' | 'week' | 'month';

type CashFlowRpcResult = {
  period_start: string;
  total_income: number;
  total_expense: number;
};

type FormattedCashFlowItem = {
  date: string;
  Pemasukan: number;
  Pengeluaran: number;
  "Arus Kas Bersih": number;
};

// --- HAPUS INTERFACE BUATAN KITA, KARENA SUDAH IMPORT DARI TREMOR ---

const formatNumberShort = (value: number) => {
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
  endDate: string;
}

export default function CashFlowChart({ startDate, endDate }: CashFlowChartProps) {
  const { householdId, dataVersion } = useAppData();
  const [cashFlowData, setCashFlowData] = useState<FormattedCashFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<IntervalType>('auto');

  const effectiveInterval = useMemo(() => {
    if (interval !== 'auto') return interval;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const diff = differenceInDays(end, start);
    if (diff < 31) return 'day';
    if (diff < 92) return 'week';
    return 'month';
  }, [startDate, endDate, interval]);

  const dateFormat = useMemo(() => {
    if (effectiveInterval === 'day') return 'd MMM';
    if (effectiveInterval === 'week') return 'd MMM';
    return 'MMM yy';
  }, [effectiveInterval]);

  useEffect(() => {
    const fetchCashFlow = async () => {
      if (!householdId || !startDate || !endDate) return;
      setLoading(true);

      const { data, error } = await supabase.rpc('get_dynamic_cash_flow', {
        p_household_id: householdId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_interval_type: interval
      });

      if (error) {
        console.error("Error fetching dynamic cash flow data:", error);
        setCashFlowData([]);
      } else if (data) {
        const formattedData = data.map((item: CashFlowRpcResult) => ({
          date: format(parseISO(item.period_start), dateFormat),
          Pemasukan: item.total_income,
          Pengeluaran: item.total_expense,
          "Arus Kas Bersih": item.total_income - item.total_expense,
        }));
        setCashFlowData(formattedData);
      }
      setLoading(false);
    };

    fetchCashFlow();
  }, [householdId, startDate, endDate, dataVersion, dateFormat, interval]);

  if (loading) {
    return <SkeletonChartCard />;
  }
  
  // --- PERBAIKAN: GUNAKAN TIPE DARI TREMOR SECARA LANGSUNG ---
  const customTooltip = (props: CustomTooltipProps) => {
    const { payload, active, label } = props;
    if (!active || !payload) return null;
    return (
      <div className="w-56 rounded-tremor-default border border-tremor-border bg-tremor-background p-2 text-tremor-default shadow-tremor-dropdown">
        <p className="font-medium text-tremor-content-strong">{label}</p>
        {payload.map((category, idx) => (
          <div key={idx} className="flex flex-1 space-x-2.5">
            {/* Tambahkan fallback color jika tidak ada */}
            <div className={`flex w-1.5 flex-col bg-${category.color || 'gray'}-500 rounded`} />
            <div className="space-y-1">
              <p className="text-tremor-content">{category.dataKey}</p>
              <p className="font-medium text-tremor-content-strong">{formatCurrency(category.value as number)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };


  return (
    <Card>
      <Flex justifyContent="between" alignItems="center">
        <Title>Cash Flow Over Time</Title>
        <ToggleGroup 
          type="single" 
          defaultValue="auto" 
          value={interval} 
          onValueChange={(value: IntervalType) => { if (value) setInterval(value); }}
          className="h-8"
        >
          <ToggleGroupItem value="auto" aria-label="Auto" size="sm">Auto</ToggleGroupItem>
          <ToggleGroupItem value="day" aria-label="Day" size="sm">Day</ToggleGroupItem>
          <ToggleGroupItem value="week" aria-label="Week" size="sm">Week</ToggleGroupItem>
          <ToggleGroupItem value="month" aria-label="Month" size="sm">Month</ToggleGroupItem>
        </ToggleGroup>
      </Flex>
      {cashFlowData.length > 0 ? (
        <BarChart
            className="mt-4 h-72"
            data={cashFlowData}
            index="date"
            categories={['Pemasukan', 'Pengeluaran', 'Arus Kas Bersih']}
            colors={['green', 'red', 'blue']}
            valueFormatter={formatNumberShort}
            yAxisWidth={60}
            customTooltip={customTooltip}
        />
      ) : (
        <div className="flex h-72 items-center justify-center">
            <Text>No data for the selected period.</Text>
        </div>
      )}
    </Card>
  );
}