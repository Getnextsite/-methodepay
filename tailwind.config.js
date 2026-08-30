/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0f',
          800: '#0e0e15',
          700: '#12121b',
          600: '#171722',
        },
        violet: {
          400: '#9b85ff',
          500: '#7c5cff',
          600: '#6746e8',
        },
        // Muted greys lifted from Tailwind's defaults so 11–13px body copy
        // clears WCAG AA (4.5:1) and muted icons clear 3:1 on #0a0a0f.
        zinc: {
          500: '#86868f',
          600: '#6b6b76',
        },
        indigo: {
          500: '#4f46e5',
          600: '#4338ca',
        },
        success: '#00d632',
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.035em',
        tightest: '-0.045em',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 50px -20px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(124,92,255,0.35), 0 20px 60px -15px rgba(124,92,255,0.45)',
        lift: '0 30px 70px -25px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
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
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'gradient-pan': 'gradient-pan 6s ease infinite',
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
