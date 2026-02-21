/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fragment Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        accent: ['Caveat', 'cursive'],
      },
      fontSize: {
        // Kresna typography scale with line-height tuples
        'display': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'display-lg': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'heading-1': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'heading-2': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '600' }],
        'heading-3': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-4': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
        'metric': ['3rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '700' }],
        'metric-lg': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '700' }],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0e82f6',
          600: '#0b6fdb',
          700: '#085cba',
          800: '#064a97',
          900: '#043a78',
          950: '#022452',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#059f00',
          600: '#048a00',
          700: '#037500',
          800: '#025f00',
          900: '#014a00',
          950: '#003300',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f2f2f2',
          tertiary: '#f8f9fa',
        },
        charcoal: '#141414',
        kresna: {
          gray: '#909090',
          'gray-dark': '#6f6f6f',
          'gray-medium': '#aaaaaa',
          border: '#dcdcdc',
          light: '#f2f2f2',
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        'kresna': '1200px',
      },
      minHeight: {
        'touch': '48px',
        'touch-lg': '60px',
        'touch-xl': '80px',
      },
      height: {
        'touch': '48px',
        'touch-lg': '60px',
        'touch-xl': '80px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(14, 130, 246, 0.15)',
        'glow-lg': '0 0 40px rgba(14, 130, 246, 0.2)',
        'glow-green': '0 0 20px rgba(5, 159, 0, 0.15)',
        'glow-green-lg': '0 0 40px rgba(5, 159, 0, 0.25)',
        'card': '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'elevated': '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
        'kresna': '0 0.5px 0.5px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.06)',
        'kresna-lg': '0 4px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.04)',
        'kresna-btn': '0 0.5px 0.5px rgba(14,130,246,0.12), 0 2px 8px rgba(14,130,246,0.15), 0 6px 14px rgba(14,130,246,0.10)',
        'inner-light': 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0b6fdb, #0e82f6)',
        'gradient-accent': 'linear-gradient(135deg, #059f00, #0e82f6)',
        'gradient-glass': 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)',
        'gradient-dark': 'linear-gradient(180deg, #141414 0%, #1a1a2e 100%)',
      },
      backdropBlur: {
        'glass': '20px',
      },
      transitionTimingFunction: {
        'kresna': 'cubic-bezier(.44,0,.56,1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'stagger-1': 'fadeInUp 0.5s ease-out 0.1s both',
        'stagger-2': 'fadeInUp 0.5s ease-out 0.2s both',
        'stagger-3': 'fadeInUp 0.5s ease-out 0.3s both',
        'stagger-4': 'fadeInUp 0.5s ease-out 0.4s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14, 130, 246, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(14, 130, 246, 0.3)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(5, 159, 0, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(5, 159, 0, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
