// src/lib/reportService.ts
import { supabase } from './supabase';

export const getReportData = async (householdId: string, startDate: string, endDate: string) => {
  const [
    summaryRes,
    cashFlowRes,
    topTransactionsRes,
    spendingByCategoryRes
  ] = await Promise.all([
    supabase.rpc('get_report_summary_metrics', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_cash_flow_report', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_top_transactions_report', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_spending_by_category', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate })
  ]);

  // Error handling
  if (summaryRes.error) throw new Error(`Summary Error: ${summaryRes.error.message}`);
  if (cashFlowRes.error) throw new Error(`Cash Flow Error: ${cashFlowRes.error.message}`);
  if (topTransactionsRes.error) throw new Error(`Top Transactions Error: ${topTransactionsRes.error.message}`);
  if (spendingByCategoryRes.error) throw new Error(`Spending by Category Error: ${spendingByCategoryRes.error.message}`);

  return {
    summary: summaryRes.data[0],
    cashFlow: cashFlowRes.data,
    topTransactions: topTransactionsRes.data,
    spendingByCategory: spendingByCategoryRes.data
  };
};