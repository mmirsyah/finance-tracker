
// src/types/reports.ts
// Tipe ini mendefinisikan struktur data yang dikembalikan oleh RPC get_dashboard_cash_flow
export interface CashFlowDataPoint {
    date: string;
    income: number;
    expense: number;
    balance: number;
}

// Tipe untuk entri cache di IndexedDB
export interface CashFlowCacheEntry {
    id: string; // Kunci komposit, cth: "2025-08-01_2025-08-31"
    data: CashFlowDataPoint[];
    fetchedAt: number; // Timestamp kapan data diambil
}
