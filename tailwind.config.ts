import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'SF Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        surface: {
          base: '#0f0f14',
          1: '#1a1a24',
          2: '#222230',
          3: '#2a2a3a',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: '#2e2e3e',
          bright: '#3a3a4e',
        },
      },
    },
  },
  plugins: [],
}

export default config
