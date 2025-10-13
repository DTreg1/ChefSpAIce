import { useState, useEffect } from 'react';

export function useVisualEffects() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('enableVisualEffects');
    const userPreference = stored === null ? true : stored === 'true';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return userPreference && !prefersReducedMotion;
  });

  useEffect(() => {
    const handleVisualEffectsChange = (event: CustomEvent) => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setEnabled(event.detail.enabled && !prefersReducedMotion);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'enableVisualEffects') {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const newValue = event.newValue === 'true';
        setEnabled(newValue && !prefersReducedMotion);
      }
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      const stored = localStorage.getItem('enableVisualEffects');
      const userPreference = stored === null ? true : stored === 'true';
      setEnabled(userPreference && !event.matches);
    };

    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    window.addEventListener('visualEffectsChanged', handleVisualEffectsChange as EventListener);
    window.addEventListener('storage', handleStorageChange);
    motionMediaQuery.addEventListener('change', handleMotionPreferenceChange);

    return () => {
      window.removeEventListener('visualEffectsChanged', handleVisualEffectsChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      motionMediaQuery.removeEventListener('change', handleMotionPreferenceChange);
    };
  }, []);

  return enabled;
}
