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
      },
      minHeight: {
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
        'card': '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'elevated': '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
        'kresna': '0 0.5px 0.5px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.06)',
        'kresna-lg': '0 4px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.04)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0b6fdb, #0e82f6)',
        'gradient-accent': 'linear-gradient(135deg, #059f00, #0e82f6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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
      },
    },
  },
  plugins: [],
};
