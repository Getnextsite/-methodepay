import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080f',
          900: '#0a0e1a',
          850: '#0e1220',
          800: '#10131c',
          700: '#171b28',
          600: '#222738',
          500: '#323850',
          400: '#6b7391',
          300: '#9aa2bd',
          200: '#c3c9dd',
          100: '#e8ecf7',
        },
        mint: {
          DEFAULT: '#00ffa3',
          dim: '#00cc83',
        },
        violet: { DEFAULT: '#7c5cff' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 20px 60px -20px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
};

export default config;
