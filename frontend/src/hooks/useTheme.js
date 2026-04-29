import { useThemeContext } from '../context/ThemeContext';

/**
 * Convenience hook that exposes isDark and toggle from ThemeContext.
 * Components import this instead of the context directly.
 */
export function useTheme() {
  return useThemeContext();
}
