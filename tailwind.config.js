/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#1D4ED8',
          600: '#1A56DB',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#0F172A',
        },
        canvas: '#F5F6F8',
        surface: '#FFFFFF',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg:      '0.25rem',
        xl:      '0.5rem',
        '2xl':   '0.75rem',
        full:    '9999px',
      },
      spacing: {
        'space-xxs': '0.25rem',
        'space-xs':  '0.5rem',
        'space-sm':  '0.75rem',
        'space-md':  '1rem',
        'space-lg':  '1.5rem',
        'space-xl':  '2rem',
        'space-2xl': '3rem',
        'gutter-mobile':  '1rem',
        'gutter-desktop': '1.5rem',
        'bottom-nav-height': '4rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'metric-xl-mobile': ['26px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'metric-xl':        ['32px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg':      ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md':      ['20px', { lineHeight: '28px', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'headline-sm':      ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-base':        ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-strong':      ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body-sm':          ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-badge':      ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '600' }],
        'caption-xs':       ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
        drawer: '0 -8px 30px rgba(15, 23, 42, 0.15)',
      },
      keyframes: {
        spin: { to: { transform: 'rotate(360deg)' } },
        pulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        spin:  'spin 1s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

