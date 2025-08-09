// src/lib/periodUtils.ts

import { subMonths, addMonths, subDays, setDate, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Menghitung tanggal mulai dan selesai periode keuangan kustom berdasarkan tanggal hari ini.
 * @param startDay Hari dalam sebulan (1-31) di mana periode dimulai.
 * @returns Object berisi `from` (tanggal mulai) dan `to` (tanggal selesai).
 */
export function getCustomPeriod(startDay: number): { from: Date; to: Date } {
  // Jika startDay tidak valid atau null, kembalikan periode bulan ini.
  if (!startDay || startDay < 1 || startDay > 31) {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  }

  const today = new Date();
  const currentDayOfMonth = today.getDate();

  let startDate: Date;

  // Tentukan tanggal mulai berdasarkan apakah hari ini sudah melewati tanggal gajian
  if (currentDayOfMonth >= startDay) {
    // Periode saat ini dimulai pada bulan ini
    startDate = setDate(today, startDay);
  } else {
    // Periode saat ini dimulai pada bulan sebelumnya
    const thisMonthStartDate = setDate(today, startDay);
    startDate = subMonths(thisMonthStartDate, 1);
  }

  // Tanggal selesai adalah satu hari sebelum tanggal mulai periode berikutnya
  const endDate = subDays(addMonths(startDate, 1), 1);

  return { from: startDate, to: endDate };
}