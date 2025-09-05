// src/hooks/useMediaQuery.ts
"use client";

import { useState, useEffect } from 'react';

// This hook is now more robust and avoids hydration mismatches between server and client.
export function useMediaQuery(query: string): boolean {
  // Initialize state with a function that runs only on the client.
  // This prevents a mismatch during server-side rendering.
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false; // Default for server-side rendering
  });

  useEffect(() => {
    const media = window.matchMedia(query);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add the event listener
    media.addEventListener('change', listener);

    // Re-check and update the state when the component mounts,
    // in case the media query status changed while the component was rendering.
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Cleanup the event listener on component unmount
    return () => media.removeEventListener('change', listener);
  }, [query, matches]); // Dependency array ensures the effect re-runs if the query changes.

  return matches;
}

// Predefined breakpoints
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsMobile = () => useMediaQuery('(max-width: 1023px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');