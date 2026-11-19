import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#fcfcfc',
        card: '#ffffff',
        // ふたりば（futariba）統一カラーパレット
        primary: {
          DEFAULT: '#FF6F91',
          50: '#FFF0F3',
          100: '#FFE0E8',
          200: '#FFC2D1',
          300: '#FFA3B9',
          400: '#FF85A2',
          500: '#FF6F91',  // メインカラー
          600: '#FF3D6B',
          700: '#FF0A44',
          800: '#D60034',
          900: '#A30027',
        },
        accent: {
          DEFAULT: '#C9A0DC',
          light: '#E8D5F5',
        },
        orange: colors.rose,
        red: colors.pink,
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'var(--font-noto)', 'sans-serif'],
      },
      borderRadius: {
        'card': '20px',
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'soft-sm': '0 4px 20px -5px rgba(0,0,0,0.05)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'bounce-slow': 'bounceSlow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
