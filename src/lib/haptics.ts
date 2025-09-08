// src/lib/haptics.ts
import { useHapticPreference } from "@/hooks/use-haptic-preference";

// Definisi pola haptic untuk berbagai jenis aktivitas
export const HAPTIC_PATTERNS = {
  // Untuk interaksi ringan seperti tombol
  light: 20,
  
  // Untuk interaksi medium seperti toggle
  medium: [10, 5, 10] as number[],
  
  // Untuk interaksi kuat seperti konfirmasi
  strong: [20, 10, 20] as number[],
  
  // Untuk notifikasi
  notification: [50, 20, 50] as number[],
  
  // Untuk kesalahan
  error: [100, 50, 100] as number[],
  
  // Untuk keberhasilan
  success: [10, 5, 10, 5, 20] as number[],
  
  // Untuk peringatan
  warning: [20, 10, 20, 10, 20] as number[],
  
  // Untuk seleksi
  selection: [15, 5, 15] as number[],
  
  // Untuk transaksi baru
  transaction: [10, 5, 10, 5, 10] as number[],
  
  // Untuk penghapusan
  delete: [50, 30, 50, 30, 100] as number[]
} as const;

// Tipe untuk pola haptic
export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

// Fungsi untuk menyesuaikan intensitas haptic berdasarkan preferensi pengguna
const adjustIntensity = (pattern: number | number[], intensity: 'light' | 'medium' | 'strong'): number | number[] => {
  const multiplier = intensity === 'light' ? 0.5 : intensity === 'strong' ? 1.5 : 1;
  
  if (typeof pattern === 'number') {
    return Math.round(pattern * multiplier);
  } else {
    return pattern.map(value => Math.round(value * multiplier));
  }
};

// Versi fungsi stand-alone yang dapat digunakan di luar React context
export const triggerHapticFeedback = (
  pattern: number | number[] | HapticPattern = 'light',
  intensity: 'light' | 'medium' | 'strong' = 'medium'
) => {
  // Cek apakah browser mendukung vibrate API
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    // Cek apakah pengguna tidak memilih reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Jika pengguna tidak memilih reduced motion, maka aktifkan haptic
    if (!prefersReducedMotion) {
      // Jika pattern adalah string (preset), gunakan pola yang sudah didefinisikan
      const basePattern = typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
      const adjustedPattern = adjustIntensity(basePattern, intensity);
      navigator.vibrate(adjustedPattern);
    }
  }
};

// Versi hook untuk digunakan dalam komponen React
export const useHapticFeedback = () => {
  const { prefersReducedMotion, prefersHaptics, hapticIntensity } = useHapticPreference();
  
  const triggerHaptic = (pattern: number | number[] | HapticPattern = 'light') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Haptic diaktifkan hanya jika pengguna tidak memilih reduced motion
      // dan secara eksplisit memilih untuk mengaktifkan haptic
      if (!prefersReducedMotion && prefersHaptics) {
        // Jika pattern adalah string (preset), gunakan pola yang sudah didefinisikan
        const basePattern = typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
        const adjustedPattern = adjustIntensity(basePattern, hapticIntensity);
        navigator.vibrate(adjustedPattern);
      }
    }
  };
  
  return { triggerHaptic, prefersReducedMotion, prefersHaptics, hapticIntensity };
};