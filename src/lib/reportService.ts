// src/lib/reportService.ts
import { supabase } from './supabase';
import { TransactionSummary } from '@/types';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

/**
 * Mengambil ringkasan transaksi untuk rentang tanggal tertentu.
 */
export const getTransactionSummary = async (householdId: string, dateRange: DateRange): Promise<TransactionSummary | null> => {
    if (!householdId || !dateRange?.from || !dateRange?.to) {
        console.error("getTransactionSummary ABORTED: Missing parameters", { householdId, dateRange });
        return null;
    }
    
    const params = { 
        p_household_id: householdId, 
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'), 
        p_end_date: format(dateRange.to, 'yyyy-MM-dd') 
    };

    const { data, error } = await supabase.rpc('get_transaction_summary', params);
    
    if (error) {
        console.error("Detailed Summary Error:", error);
        throw new Error(`Detailed Summary Error: ${error.message}`);
    }

    return (data && data.length > 0 ? data[0] : null) as TransactionSummary | null;
}


export const getReportData = async (householdId: string, startDate: string, endDate: string) => {
  if (!householdId || !startDate || !endDate) {
    console.error("getReportData ABORTED: Missing parameters", { householdId, startDate, endDate });
    return { summary: null, cashFlow: [], topTransactions: [], spendingByCategory: [], detailedSummary: null };
  }
  
  const params = { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate };

  const [
    summaryRes,
    cashFlowRes,
    topTransactionsRes,
    spendingByCategoryRes,
    detailedSummaryRes
  ] = await Promise.all([
    supabase.rpc('get_report_summary_metrics', params),
    supabase.rpc('get_cash_flow_and_balance_report', params),
    supabase.rpc('get_top_transactions_report', params),
    supabase.rpc('get_spending_by_category', params),
    supabase.rpc('get_transaction_summary', params)
  ]);

  if (summaryRes.error) throw new Error(`Summary Error: ${summaryRes.error.message}`);
  if (cashFlowRes.error) {
      console.error("Cash Flow Error Details:", cashFlowRes.error);
      throw new Error(`Cash Flow Error: ${cashFlowRes.error.message}`);
  }
  if (topTransactionsRes.error) throw new Error(`Top Transactions Error: ${topTransactionsRes.error.message}`);
  if (spendingByCategoryRes.error) throw new Error(`Spending by Category Error: ${spendingByCategoryRes.error.message}`);
  if (detailedSummaryRes.error) throw new Error(`Detailed Summary Error: ${detailedSummaryRes.error.message}`);

  return {
    summary: summaryRes.data[0],
    cashFlow: cashFlowRes.data,
    topTransactions: topTransactionsRes.data,
    spendingByCategory: spendingByCategoryRes.data,
    detailedSummary: (detailedSummaryRes.data && detailedSummaryRes.data.length > 0 ? detailedSummaryRes.data[0] : null) as TransactionSummary | null
  };
};

export const getTransactionsForExport = async (householdId: string, startDate: string, endDate: string) => {
  const { data, error } = await supabase.rpc('get_transactions_for_export', {
    p_household_id: householdId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) { throw new Error(`Export Error: ${error.message}`); }
  return data;
};

export const getComparisonMetrics = async (householdId: string, currentStartDate: Date, currentEndDate: Date, previousStartDate: Date, previousEndDate: Date) => {
    const { data, error } = await supabase.rpc('get_comparison_metrics', {
        p_household_id: householdId,
        p_current_start_date: format(currentStartDate, 'yyyy-MM-dd'),
        p_current_end_date: format(currentEndDate, 'yyyy-MM-dd'),
        p_previous_start_date: format(previousStartDate, 'yyyy-MM-dd'),
        p_previous_end_date: format(previousEndDate, 'yyyy-MM-dd'),
    });

    if (error) {
        console.error('Error fetching comparison metrics:', error);
        throw new Error(`Comparison Metrics Error: ${error.message}`);
    }
    
    return data[0];
}

export const getDashboardCashFlow = async (householdId: string, dateRange: DateRange) => {
    if (!dateRange.from || !dateRange.to) return [];
    
    const { data, error } = await supabase.rpc('get_dashboard_cash_flow', {
        p_household_id: householdId,
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd')
    });
    
    if (error) {
        console.error("Dashboard cash flow error:", error);
        throw new Error(error.message);
    }
    return data;
};
