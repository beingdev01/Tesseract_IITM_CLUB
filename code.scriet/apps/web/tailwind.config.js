/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Audiowide', 'Orbitron', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Tesseract 6-color logo palette
        tesseract: {
          red:    '#ff3b3b',
          orange: '#ff8a3b',
          yellow: '#ffd93b',
          green:  '#5eff7a',
          blue:   '#3bb0ff',
          purple: '#a855f7',
        },
        // Soft yellow — see DESIGN_SYSTEM.md §5
        'yellow-soft':    'var(--c-yellow-soft)',
        'yellow-soft-bg': 'var(--c-yellow-soft-bg)',

        // Surface elevation — see DESIGN_SYSTEM.md §3
        'surface-0':     'var(--surface-0)',
        'surface-1':     'var(--surface-1)',
        'surface-2':     'var(--surface-2)',
        'surface-3':     'var(--surface-3)',
        'surface-hover': 'var(--surface-hover)',

        // Border tier — see DESIGN_SYSTEM.md §4
        'edge-subtle':  'var(--border-subtle)',
        'edge-default': 'var(--border-default)',
        'edge-strong':  'var(--border-strong)',

        // Text tier — see DESIGN_SYSTEM.md §2
        fg:         'var(--fg)',
        'fg-dim':   'var(--fg-dim)',
        'fg-mute':  'var(--fg-mute)',
        'fg-faint': 'var(--fg-faint)',

        // State
        error:        'var(--error)',
        'error-bg':   'var(--error-bg)',
        'error-fg':   'var(--error-fg)',
        success:      'var(--success)',
        'success-bg': 'var(--success-bg)',

        // Override amber → soft Tesseract yellow ramp (legacy code uses bg-amber-* etc.)
        // 50–300 = transparent overlays; 400 = brand pop; 500–800 = soft yellow tones for fills/text.
        amber: {
          50:  'rgba(255, 217, 59, 0.06)',
          100: 'rgba(255, 217, 59, 0.10)',
          200: 'rgba(255, 217, 59, 0.18)',
          300: 'rgba(255, 217, 59, 0.30)',
          400: '#ffd93b',
          500: '#d9b526',  /* soft yellow — was #ffd93b; safer for backgrounds + text */
          600: '#c9a02e',  /* soft yellow — matches --c-yellow-soft */
          700: '#a8821f',  /* darker soft yellow */
          800: '#7a5e15',  /* dark ochre — for text on light bg */
          900: '#fff',     /* used as text color where high contrast wanted */
          950: '#fff',
        },
        // Override orange → softer Tesseract orange ramp
        orange: {
          50:  'rgba(255, 138, 59, 0.06)',
          100: 'rgba(255, 138, 59, 0.10)',
          200: 'rgba(255, 138, 59, 0.18)',
          300: 'rgba(255, 138, 59, 0.30)',
          400: '#ff8a3b',
          500: '#d97320',  /* soft orange — gradient targets */
          600: '#b85e15',
          700: '#8f4810',
          800: '#6b340a',
          900: '#fff',
          950: '#fff',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
