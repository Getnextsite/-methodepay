/**
 * Colours are CSS variables (see src/index.css) so one set of class names
 * serves both the dark and the light theme.
 *
 * Two names are semantic rather than literal, which keeps every existing
 * class working in both themes:
 *   white  -> the foreground colour (white on dark, ink on light)
 *   violet / indigo -> the brand primary / secondary ramp
 * Use `pure` when you need real white and `onaccent` for text on a brand fill.
 */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        white: v('--fg'),
        pure: '#ffffff',
        onaccent: v('--on-accent'),
        ink: {
          DEFAULT: v('--bg'),
          800: v('--bg-800'),
          700: v('--bg-700'),
          600: v('--bg-600'),
        },
        card: v('--card'),
        violet: {
          200: v('--p300'),
          300: v('--p300'),
          400: v('--p400'),
          500: v('--p'),
          600: v('--p600'),
        },
        indigo: {
          500: v('--s'),
          600: v('--s600'),
        },
        zinc: {
          100: v('--z100'),
          200: v('--z200'),
          300: v('--z300'),
          400: v('--z400'),
          500: v('--z500'),
          600: v('--z600'),
        },
        amber: {
          300: v('--amber'),
        },
        success: v('--success'),
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.03em',
        tightest: '-0.04em',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: '0 0 0 1px rgb(var(--p) / 0.35), 0 20px 60px -15px rgb(var(--p) / 0.45)',
        lift: 'var(--shadow-lift)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--tilt, 0deg))' },
          '50%': { transform: 'translateY(-12px) rotate(var(--tilt, 0deg))' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(4%,-3%,0) scale(1.08)' },
          '66%': { transform: 'translate3d(-3%,3%,0) scale(0.96)' },
        },
        'stage-in': {
          from: { opacity: '0', transform: 'perspective(1600px) rotateX(16deg) translateY(48px) scale(0.96)' },
          to: { opacity: '1', transform: 'perspective(1600px) rotateX(0deg) translateY(0) scale(1)' },
        },
        draw: {
          from: { strokeDashoffset: 'var(--len, 600)' },
          to: { strokeDashoffset: '0' },
        },
        'bar-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'bar-grow': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        shimmer: {
          from: { transform: 'translateX(-120%)' },
          to: { transform: 'translateX(220%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'gradient-pan': 'gradient-pan 6s ease infinite',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        marquee: 'marquee 38s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        aurora: 'aurora 18s ease-in-out infinite',
        'stage-in': 'stage-in 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
        draw: 'draw 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both',
        'bar-grow': 'bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 3.2s ease-in-out infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
      },
    },
  },
  plugins: [],
}
