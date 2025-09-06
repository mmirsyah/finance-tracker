import { useEffect, useState } from 'react';

export const useHapticPreference = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHaptics, setPrefersHaptics] = useState(true);

  useEffect(() => {
    // Cek preferensi reduced motion dari sistem
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Untuk haptic preference, kita asumsikan default aktif kecuali ada indikasi lain
    // Di masa depan, bisa ditambahkan pengaturan eksplisit di halaman settings
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Haptic diaktifkan jika tidak ada preferensi reduced motion
  // dan pengguna belum menonaktifkannya secara eksplisit
  return {
    prefersReducedMotion,
    prefersHaptics,
    enableHaptics: () => setPrefersHaptics(true),
    disableHaptics: () => setPrefersHaptics(false)
  };
};