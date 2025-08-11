// src/lib/periodUtils.ts

import { subMonths, addMonths, subDays, setDate, startOfMonth, endOfMonth } from 'date-fns';

/**
 * ====================================================================
 * PERBAIKAN DI SINI: Fungsi dibuat lebih fleksibel
 * ====================================================================
 * Menghitung tanggal mulai dan selesai periode keuangan kustom.
 * @param startDay Hari dalam sebulan (1-31) di mana periode dimulai.
 * @param fromDate Tanggal referensi (opsional). Jika tidak diberikan, akan menggunakan tanggal hari ini.
 * @returns Object berisi `from` (tanggal mulai) dan `to` (tanggal selesai).
 */
export function getCustomPeriod(startDay: number, fromDate?: Date): { from: Date; to: Date } {
  const referenceDate = fromDate || new Date(); // Gunakan fromDate jika ada, jika tidak, gunakan hari ini

  // Jika startDay tidak valid atau null, kembalikan periode bulan dari tanggal referensi.
  if (!startDay || startDay < 1 || startDay > 31) {
    return {
      from: startOfMonth(referenceDate),
      to: endOfMonth(referenceDate),
    };
  }

  const currentDayOfMonth = referenceDate.getDate();

  let startDate: Date;

  // Tentukan tanggal mulai berdasarkan tanggal referensi
  if (currentDayOfMonth >= startDay) {
    // Periode dimulai pada bulan dari tanggal referensi
    startDate = setDate(referenceDate, startDay);
  } else {
    // Periode dimulai pada bulan sebelumnya dari tanggal referensi
    const thisMonthStartDate = setDate(referenceDate, startDay);
    startDate = subMonths(thisMonthStartDate, 1);
  }

  const endDate = subDays(addMonths(startDate, 1), 1);

  return { from: startDate, to: endDate };
}


/**
 * Mendapatkan string periode saat ini dalam format YYYY-MM-01.
 * Ini digunakan oleh fitur Budget untuk menyimpan dan mengambil data per bulan.
 * @returns string Format 'YYYY-MM-DD'. Contoh: '2024-08-01'.
 */
export const getCurrentPeriod = (): string => {
  const now = new Date();
  const firstDayOfMonth = setDate(now, 1);
  return firstDayOfMonth.toISOString().split('T')[0];
};