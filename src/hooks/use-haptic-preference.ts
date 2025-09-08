import { useEffect, useState } from 'react';

export const useHapticPreference = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHaptics, setPrefersHaptics] = useState(true);
  const [hapticIntensity, setHapticIntensity] = useState<'light' | 'medium' | 'strong'>('medium');

  useEffect(() => {
    // Cek preferensi reduced motion dari sistem
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Muat preferensi haptic dari localStorage jika tersedia
    if (typeof window !== 'undefined') {
      const savedHapticPreference = localStorage.getItem('hapticPreference');
      if (savedHapticPreference !== null) {
        setPrefersHaptics(savedHapticPreference === 'true');
      }
      
      const savedHapticIntensity = localStorage.getItem('hapticIntensity');
      if (savedHapticIntensity && ['light', 'medium', 'strong'].includes(savedHapticIntensity)) {
        setHapticIntensity(savedHapticIntensity as 'light' | 'medium' | 'strong');
      }
    }
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const enableHaptics = () => {
    setPrefersHaptics(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hapticPreference', 'true');
    }
  };

  const disableHaptics = () => {
    setPrefersHaptics(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hapticPreference', 'false');
    }
  };

  const setIntensity = (intensity: 'light' | 'medium' | 'strong') => {
    setHapticIntensity(intensity);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hapticIntensity', intensity);
    }
  };

  // Haptic diaktifkan jika tidak ada preferensi reduced motion
  // dan pengguna belum menonaktifkannya secara eksplisit
  return {
    prefersReducedMotion,
    prefersHaptics,
    hapticIntensity,
    enableHaptics,
    disableHaptics,
    setIntensity
  };
};