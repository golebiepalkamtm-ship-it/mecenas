import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          primary: '#d4af37',
          light: '#f9e29d',
          dark: '#a78a2c',
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        glass: {
          bg: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.06)',
          active: 'rgba(255, 255, 255, 0.12)',
        },
        prestige: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.6)' },
        }
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'shell': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    daisyui,
  ],
  daisyui: {
    themes: [
      {
        prestige: {
          "primary": "#d4af37",
          "primary-focus": "#a78a2c",
          "primary-content": "#020617",
          "secondary": "#ffffff",
          "secondary-focus": "#e5e7eb",
          "secondary-content": "#020617",
          "accent": "#d4af37",
          "accent-focus": "#a78a2c",
          "accent-content": "#020617",
          "neutral": "#1e293b",
          "neutral-focus": "#0f172a",
          "neutral-content": "#f8fafc",
          "base-100": "#020617",
          "base-200": "#0f172a",
          "base-300": "#1e293b",
          "base-content": "#f8fafc",
          "info": "#d4af37",
          "success": "#d4af37",
          "warning": "#f59e0b",
          "error": "#991b1b",
        }
      }
    ],
    darkTheme: "prestige",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: false,
  },
}
