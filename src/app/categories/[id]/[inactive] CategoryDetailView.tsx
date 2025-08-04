// src/app/categories/[id]/CategoryDetailView.tsx

/* "use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Category, Transaction } from '@/types';
import { ArrowLeft, Edit } from 'lucide-react';
import { BarChart, Card, Title, Text } from '@tremor/react';
import { 
  format, 
  getYear,
  getQuarter,
  startOfMonth,
} from 'date-fns';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

type TimeView = 'monthly' | 'quarterly' | 'yearly';

interface CategoryDetailViewProps {
  initialCategory: Category;
  initialTransactions: Transaction[];
}

export default function CategoryDetailView({ initialCategory, initialTransactions }: CategoryDetailViewProps) {
  const router = useRouter();
  const [category] = useState<Category | null>(initialCategory);
  const [timeView, setTimeView] = useState<TimeView>('monthly');
  
  // --- LOGIKA BARU UNTUK FILTER MULTI-TAHUN ---
  const availableYears = useMemo(() => 
    [...new Set(initialTransactions.map(t => getYear(new Date(t.date)).toString()))]
    .sort((a, b) => b.localeCompare(a)), 
  [initialTransactions]);

  // State untuk menyimpan tahun-tahun yang aktif, defaultnya adalah tahun terbaru saja
  const [selectedYears, setSelectedYears] = useState<string[]>(availableYears.length > 0 ? [availableYears[0]] : []);

  const toggleYear = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const processedData = useMemo(() => {
    // Filter transaksi berdasarkan tahun-tahun yang dipilih
    const yearFilteredTransactions = initialTransactions.filter(t => 
      selectedYears.includes(getYear(new Date(t.date)).toString())
    );
    
    // Agregasi data
    const aggregation: { [key: string]: number } = {};
    yearFilteredTransactions.forEach(t => {
      const date = new Date(t.date);
      let key = '';

      if (timeView === 'monthly') {
        key = format(startOfMonth(date), 'MMM yyyy');
      } else if (timeView === 'quarterly') {
        key = `Q${getQuarter(date)} ${getYear(date)}`;
      } else if (timeView === 'yearly') {
        key = getYear(date).toString();
      }

      if (!aggregation[key]) { aggregation[key] = 0; }
      aggregation[key] += t.type === 'expense' ? t.amount : -t.amount;
    });

    const chartData = Object.entries(aggregation)
      .map(([period, total]) => ({ period, Total: Math.abs(total) }))
      .sort((a, b) => {
          if (timeView === 'monthly') return new Date(a.period).getTime() - new Date(b.period).getTime();
          return a.period.localeCompare(b.period);
      });

    return { chartData, displayedTransactions: yearFilteredTransactions };
  }, [initialTransactions, timeView, selectedYears]);

  if (!category) {
    return <div className="p-6">Category not found.</div>;
  }
  
  const FilterButton = ({ view, label }: { view: TimeView, label: string }) => (
    <button
      onClick={() => setTimeView(view)}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
        timeView === view ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  );

  const YearToggleButton = ({ year }: { year: string }) => (
    <button
      onClick={() => toggleYear(year)}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
        selectedYears.includes(year) ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-100'
      }`}
    >
      {year}
    </button>
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-4 sm:p-6 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline mb-2">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <div className="flex items-center gap-2">
                <button onClick={() => router.push('/categories')} className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md bg-white border text-gray-700 hover:bg-gray-100">
                  <Edit size={14} /> Edit category
                </button>
                <div className="p-1 bg-gray-200 rounded-md flex items-center gap-1">
                    <FilterButton view="monthly" label="Monthly" />
                    <FilterButton view="quarterly" label="Quarterly" />
                    <FilterButton view="yearly" label="Yearly" />
                </div>
            </div>
        </div>
      </div>

      <Card>
        <div className="flex justify-center items-center gap-2 mb-4">
          {availableYears.map(year => <YearToggleButton key={year} year={year} />)}
        </div>
        <BarChart
          className="h-72"
          data={processedData.chartData}
          index="period"
          categories={['Total']}
          colors={['blue']}
          yAxisWidth={60}
          valueFormatter={formatCurrency}
          noDataText="No data for the selected year(s)."
        />
      </Card>

      <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b"><h3 className="text-lg font-semibold">Transactions</h3></div>
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {processedData.displayedTransactions.map((t) => (
                <tr key={t.id}>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">{t.accounts?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.note || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-semibold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                </tr>
                ))}
            </tbody>
        </table>
        {processedData.displayedTransactions.length === 0 && (<p className="p-6 text-center text-gray-500">No transactions found for the selected year(s).</p>)}
      </div>
    </div>
  );
} */