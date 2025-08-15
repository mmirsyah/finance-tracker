// src/lib/reportService.ts
import { supabase } from './supabase';
import { TransactionSummary } from '@/types'; // Import tipe TransactionSummary

export const getReportData = async (householdId: string, startDate: string, endDate: string) => {
  const [
    summaryRes,
    cashFlowRes,
    topTransactionsRes,
    spendingByCategoryRes,
    // --- TAMBAHAN: Panggil RPC get_transaction_summary ---
    detailedSummaryRes
  ] = await Promise.all([
    supabase.rpc('get_report_summary_metrics', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_cash_flow_report', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_top_transactions_report', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_spending_by_category', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
    // --- TAMBAHAN: Panggilan RPC baru ---
    supabase.rpc('get_transaction_summary', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate })
  ]);

  // Error handling
  if (summaryRes.error) throw new Error(`Summary Error: ${summaryRes.error.message}`);
  if (cashFlowRes.error) throw new Error(`Cash Flow Error: ${cashFlowRes.error.message}`);
  if (topTransactionsRes.error) throw new Error(`Top Transactions Error: ${topTransactionsRes.error.message}`);
  if (spendingByCategoryRes.error) throw new Error(`Spending by Category Error: ${spendingByCategoryRes.error.message}`);
  // --- TAMBAHAN: Error handling baru ---
  if (detailedSummaryRes.error) throw new Error(`Detailed Summary Error: ${detailedSummaryRes.error.message}`);


  return {
    summary: summaryRes.data[0],
    cashFlow: cashFlowRes.data,
    topTransactions: topTransactionsRes.data,
    spendingByCategory: spendingByCategoryRes.data,
    // --- TAMBAHAN: Sertakan data baru di hasil return ---
    detailedSummary: detailedSummaryRes.data[0] as TransactionSummary
  };
};

// Fungsi ini tidak berubah
export const getTransactionsForExport = async (householdId: string, startDate: string, endDate: string) => {
  const { data, error } = await supabase.rpc('get_transactions_for_export', {
    p_household_id: householdId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    throw new Error(`Export Error: ${error.message}`);
  }
  return data;
};