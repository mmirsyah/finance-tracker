// src/lib/haptics.ts
import { useHapticPreference } from "@/hooks/use-haptic-preference";

// Versi fungsi stand-alone yang dapat digunakan di luar React context
export const triggerHapticFeedback = (pattern: number | number[] = 20) => {
  // Cek apakah browser mendukung vibrate API
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    // Cek apakah pengguna tidak memilih reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Jika pengguna tidak memilih reduced motion, maka aktifkan haptic
    if (!prefersReducedMotion) {
      navigator.vibrate(pattern);
    }
  }
};

// Versi hook untuk digunakan dalam komponen React
export const useHapticFeedback = () => {
  const { prefersReducedMotion, prefersHaptics } = useHapticPreference();
  
  const triggerHaptic = (pattern: number | number[] = 20) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Haptic diaktifkan hanya jika pengguna tidak memilih reduced motion
      // dan secara eksplisit memilih untuk mengaktifkan haptic
      if (!prefersReducedMotion && prefersHaptics) {
        navigator.vibrate(pattern);
      }
    }
  };
  
  return { triggerHaptic, prefersReducedMotion, prefersHaptics };
};