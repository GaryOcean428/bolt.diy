import { atom } from 'nanostores';
import { logStore } from './logs';

export type Theme = 'dark' | 'light';

export const kTheme = 'bolt_theme';

export function themeIsDark() {
  return themeStore.get() === 'dark';
}

export const DEFAULT_THEME = 'light';

export const themeStore = atom<Theme>(DEFAULT_THEME);

function initClientTheme() {
  if (import.meta.env.SSR) return;
  
  const persistedTheme = localStorage.getItem(kTheme) as Theme | undefined;
  const themeAttribute = document.querySelector('html')?.getAttribute('data-theme');
  const clientTheme = persistedTheme ?? (themeAttribute as Theme) ?? DEFAULT_THEME;
  
  if (clientTheme !== themeStore.get()) {
    themeStore.set(clientTheme);
  }
}

// Initialize client theme after hydration
if (!import.meta.env.SSR) {
  setTimeout(initClientTheme, 0);
}

export function toggleTheme() {
  const currentTheme = themeStore.get();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  themeStore.set(newTheme);
  logStore.logSystem(`Theme changed to ${newTheme} mode`);
  localStorage.setItem(kTheme, newTheme);
  document.querySelector('html')?.setAttribute('data-theme', newTheme);
}
