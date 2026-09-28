/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#080d1a',
        },
        neon: {
          cyan: '#06b6d4',
          'cyan-bright': '#22d3ee',
          violet: '#8b5cf6',
          'violet-bright': '#a78bfa',
          emerald: '#10b981',
          'emerald-bright': '#34d399',
          amber: '#f59e0b',
          'amber-bright': '#fbbf24',
          rose: '#f43f5e',
          'rose-bright': '#fb7185',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.45)',
        'glow-violet': '0 0 20px -3px rgba(139, 92, 246, 0.45)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.45)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
