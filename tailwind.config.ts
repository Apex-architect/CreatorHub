import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.2' }],
        sm: ['0.875rem', { lineHeight: '1.3' }],
        base: ['1rem', { lineHeight: '1.5' }],
        lg: ['1.125rem', { lineHeight: '1.5' }],
        xl: ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.35' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      spacing: {
        0.5: '0.125rem',
        1.5: '0.375rem',
        2.5: '0.625rem',
        3.5: '0.875rem',
        4.5: '1.125rem',
        5.5: '1.375rem',
        7.5: '1.875rem',
        9: '2.25rem',
        11: '2.75rem',
        13: '3.25rem',
        15: '3.75rem',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
        'soft-lg': '0 18px 45px rgba(15, 23, 42, 0.12)',
        'inner-subtle': 'inset 0 0 0 1px rgba(15, 23, 42, 0.06)',
      },
      backdropBlur: {
        xs: '2px',
      },
      maxWidth: {
        'content-sm': '640px',
        'content-md': '768px',
        'content-lg': '1024px',
        'content-xl': '1280px',
      },
      transitionTimingFunction: {
        subtle: 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  plugins: [
    function focusRingPlugin({ addUtilities }: { addUtilities: (utils: Record<string, unknown>) => void }) {
      addUtilities({
        '.focus-ring': {
          outline: 'none',
          boxShadow:
            '0 0 0 1px hsl(var(--background)), 0 0 0 3px hsl(var(--ring))',
        },
        '.focus-ring-inset': {
          outline: 'none',
          boxShadow:
            'inset 0 0 0 1px hsl(var(--ring)), 0 0 0 1px transparent',
        },
      });
    },
  ],
};

export default config;


