import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, Sun, Moon, Shield } from 'lucide-react';
import { useTheme, ThemeId, ThemeConfig } from '../context/ThemeContext.js';
import { soundFx } from '../services/audioFeedback.js';

interface ThemeSelectorProps {
  variant?: 'dropdown' | 'inline';
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = 'dropdown',
  className = ''
}) => {
  const { theme, setTheme, currentTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (newTheme: ThemeId) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="grid grid-cols-3 gap-2">
          {availableThemes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 group relative overflow-hidden ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-500/10 shadow-glow-cyan'
                    : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
                style={{
                  borderColor: isSelected ? t.accentHex : undefined
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  {/* Swatch dots */}
                  <div className="flex items-center -space-x-1">
                    {t.previewColors.map((color, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-slate-900 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {isSelected && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-slate-950 text-[10px] font-bold"
                      style={{ backgroundColor: t.accentHex }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-200 block truncate">
                    {t.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                    {t.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          soundFx.playClick(620);
          setIsOpen(!isOpen)}
        }
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-white transition-all group"
        title="Switch Interface Aesthetic Theme"
        aria-label="Switch Theme"
      >
        <Palette className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
        
        {/* Color preview dot */}
        <span
          className="w-2.5 h-2.5 rounded-full border border-slate-800 shadow-sm"
          style={{ backgroundColor: currentTheme.accentHex }}
        />

        <span className="hidden sm:inline font-semibold">{currentTheme.shortName}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 md:w-80 rounded-2xl glass-panel bg-slate-950/95 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Theme Engine</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Persisted locally</span>
          </div>

          <div className="space-y-1.5 p-1">
            {availableThemes.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-3 transition-all relative ${
                    isSelected
                      ? 'bg-slate-900/90 border-cyan-500/50 shadow-sm'
                      : 'bg-transparent hover:bg-slate-900/50 border-transparent hover:border-slate-800'
                  }`}
                  style={{
                    borderColor: isSelected ? t.accentHex : undefined
                  }}
                >
                  {/* Swatch indicator circle */}
                  <div
                    className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-md mt-0.5"
                    style={{
                      backgroundColor: t.bgHex,
                      borderColor: t.accentHex
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-glow-cyan"
                      style={{
                        backgroundColor: t.accentHex,
                        boxShadow: `0 0 10px ${t.accentHex}`
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {t.name}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 font-medium"
                        style={{
                          backgroundColor: `${t.accentHex}15`,
                          borderColor: `${t.accentHex}40`,
                          color: t.accentHex
                        }}
                      >
                        {t.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {t.description}
                    </p>
                  </div>

                  {/* Radio check */}
                  {isSelected && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-slate-950 shrink-0 mt-1"
                      style={{ backgroundColor: t.accentHex }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 px-3 py-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Fast Switch: Click or Key</span>
            <span className="text-cyan-400 font-semibold">{currentTheme.name}</span>
          </div>
        </div>
      )}
    </div>
  );
};
