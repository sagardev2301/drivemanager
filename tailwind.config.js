/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch Design System — full semantic color palette
        'primary':                    '#003fb1',
        'on-primary':                 '#ffffff',
        'primary-container':          '#1a56db',
        'on-primary-container':       '#d4dcff',
        'primary-fixed':              '#dbe1ff',
        'primary-fixed-dim':          '#b5c4ff',
        'on-primary-fixed':           '#00174d',
        'on-primary-fixed-variant':   '#003dab',

        'secondary':                  '#3858b6',
        'on-secondary':               '#ffffff',
        'secondary-container':        '#7e9cfe',
        'on-secondary-container':     '#002f8a',
        'secondary-fixed':            '#dbe1ff',
        'secondary-fixed-dim':        '#b5c4ff',
        'on-secondary-fixed':         '#00164d',
        'on-secondary-fixed-variant': '#1a3f9c',

        'tertiary':                   '#005623',
        'on-tertiary':                '#ffffff',
        'tertiary-container':         '#007130',
        'on-tertiary-container':      '#65f98b',
        'tertiary-fixed':             '#6bff8f',
        'tertiary-fixed-dim':         '#4ae176',
        'on-tertiary-fixed':          '#002109',
        'on-tertiary-fixed-variant':  '#005321',

        'error':                      '#ba1a1a',
        'on-error':                   '#ffffff',
        'error-container':            '#ffdad6',
        'on-error-container':         '#93000a',

        'surface':                    '#f9f9ff',
        'on-surface':                 '#141b2b',
        'surface-variant':            '#dce2f7',
        'on-surface-variant':         '#434654',
        'surface-container-lowest':   '#ffffff',
        'surface-container-low':      '#f1f3ff',
        'surface-container':          '#e9edff',
        'surface-container-high':     '#e1e8fd',
        'surface-container-highest':  '#dce2f7',
        'surface-dim':                '#d3daef',
        'surface-bright':             '#f9f9ff',
        'surface-tint':               '#1353d8',

        'background':                 '#f9f9ff',
        'on-background':              '#141b2b',

        'outline':                    '#737686',
        'outline-variant':            '#c3c5d7',

        'inverse-surface':            '#293040',
        'inverse-on-surface':         '#edf0ff',
        'inverse-primary':            '#b5c4ff',
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

