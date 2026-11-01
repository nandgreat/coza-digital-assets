/**
 * React Hook for Programmatic Glass Root Variable Adjustments
 * 
 * Allows dynamic runtime override of glass parameters (e.g. user-adjusted blur intensity or glow hue).
 *
 * @module hooks/useGlassThemeVariables
 */
import { useCallback } from 'react';

/**
 * @typedef {Object} GlassOverrides
 * @property {string} [blur] - CSS blur value (e.g. '20px')
 * @property {string} [bgOpacity] - Glass background opacity value
 * @property {string} [glowColor] - Custom RGBA glow color
 */

export const useGlassThemeVariables = () => {
  /**
   * Updates root CSS variables programmatically
   * @param {GlassOverrides} overrides
   */
  const setGlassVariables = useCallback(({ blur, bgOpacity, glowColor }) => {
    const root = document.documentElement;

    if (blur) {
      root.style.setProperty('--glass-blur', blur);
    }
    if (bgOpacity) {
      root.style.setProperty('--glass-bg', `rgba(20, 26, 51, ${bgOpacity})`);
    }
    if (glowColor) {
      root.style.setProperty('--glass-glow-accent', glowColor);
    }
  }, []);

  /**
   * Resets root CSS variables to default theme stylesheet values
   */
  const resetGlassVariables = useCallback(() => {
    const root = document.documentElement;
    root.style.removeProperty('--glass-blur');
    root.style.removeProperty('--glass-bg');
    root.style.removeProperty('--glass-glow-accent');
  }, []);

  return { setGlassVariables, resetGlassVariables };
};