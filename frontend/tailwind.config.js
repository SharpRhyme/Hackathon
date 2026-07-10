/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        soft: 'rgb(var(--c-soft) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        clay: {
          DEFAULT: 'rgb(var(--c-clay) / <alpha-value>)',
          deep: 'rgb(var(--c-clay-deep) / <alpha-value>)',
          wash: 'rgb(var(--c-clay-wash) / <alpha-value>)',
        },
        moss: {
          DEFAULT: 'rgb(var(--c-moss) / <alpha-value>)',
          wash: 'rgb(var(--c-moss-wash) / <alpha-value>)',
        },
        sky: {
          DEFAULT: 'rgb(var(--c-sky) / <alpha-value>)',
          wash: 'rgb(var(--c-sky-wash) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          wash: 'rgb(var(--c-gold-wash) / <alpha-value>)',
        },
        berry: {
          DEFAULT: 'rgb(var(--c-berry) / <alpha-value>)',
          wash: 'rgb(var(--c-berry-wash) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        pixel: ['VT323', 'monospace'],
        dyslexic: ['OpenDyslexic', 'Comic Sans MS', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 1px rgb(0 0 0 / 0.03), 0 2px 8px -2px rgb(0 0 0 / 0.05)',
        lift: '0 2px 4px rgb(0 0 0 / 0.05), 0 12px 28px -10px rgb(0 0 0 / 0.14)',
        press: 'inset 0 2px 4px rgb(0 0 0 / 0.08)',
      },
      borderRadius: {
        card: '0.875rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 2.2s linear infinite',
        'float-y': 'float-y 3.5s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [],
}
