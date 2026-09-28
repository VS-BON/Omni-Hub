import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { soundFx } from '../services/audioFeedback.js';

export type ThemeId = 'slate' | 'amber' | 'emerald';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  accentHex: string;
  secondaryHex: string;
  bgHex: string;
  borderHex: string;
  previewColors: string[];
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'slate',
    name: 'Dark Slate',
    shortName: 'Slate',
    badge: 'Obsidian & Cyan',
    description: 'Deep obsidian cockpit with cyber cyan and electric violet neon telemetry accents.',
    accentHex: '#06b6d4',
    secondaryHex: '#8b5cf6',
    bgHex: '#070b14',
    borderHex: 'rgba(6, 182, 212, 0.4)',
    previewColors: ['#070b14', '#06b6d4', '#8b5cf6']
  },
  {
    id: 'amber',
    name: 'Cyberpunk Amber',
    shortName: 'Amber',
    badge: 'High Contrast',
    description: 'High-contrast industrial cyberpunk aesthetic with hot hazard amber, phosphor glow, and stark lines.',
    accentHex: '#f59e0b',
    secondaryHex: '#f97316',
    bgHex: '#0a0702',
    borderHex: 'rgba(245, 158, 11, 0.5)',
    previewColors: ['#0a0702', '#f59e0b', '#fbbf24']
  },
  {
    id: 'emerald',
    name: 'Deep Emerald',
    shortName: 'Emerald',
    badge: 'Bioluminescent',
    description: 'Abyssal deep jade matrix with bioluminescent mint indicators and military command telemetry.',
    accentHex: '#10b981',
    secondaryHex: '#06b6d4',
    bgHex: '#030e09',
    borderHex: 'rgba(16, 185, 129, 0.5)',
    previewColors: ['#030e09', '#10b981', '#34d399']
  }
];

const STORAGE_KEY = 'omnihub_theme';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
  currentTheme: ThemeConfig;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'slate';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved && (saved === 'slate' || saved === 'amber' || saved === 'emerald')) {
      return saved;
    }
  } catch (e) {
    console.warn('[ThemeEngine] Could not read localStorage theme preference:', e);
  }
  return 'slate';
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);

  // Apply theme attributes to document whenever theme changes
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.classList.remove('theme-slate', 'theme-amber', 'theme-emerald');
      root.classList.add(`theme-${theme}`);
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.warn('[ThemeEngine] Could not persist theme preference:', e);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    if (newTheme !== theme) {
      soundFx.playClick(newTheme === 'amber' ? 680 : newTheme === 'emerald' ? 760 : 620);
      setThemeState(newTheme);
    }
  };

  const cycleTheme = () => {
    const order: ThemeId[] = ['slate', 'amber', 'emerald'];
    const currentIndex = order.indexOf(theme);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        cycleTheme,
        currentTheme,
        availableThemes: THEMES
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
