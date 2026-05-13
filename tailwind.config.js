/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dusk: {
          50: '#fbf3e7',
          100: '#f4e2c4',
          200: '#e8c290',
          300: '#d9a06d',
          400: '#bf7d52',
          500: '#8f5236',
          600: '#5d3525',
          700: '#3a2218',
          800: '#241511',
          900: '#120a09',
        },
        moss: {
          400: '#86a86a',
          500: '#5a8050',
          600: '#3b5d38',
          700: '#26402a',
        },
        ember: {
          300: '#ffd28a',
          400: '#ffa84a',
          500: '#ff8030',
          600: '#d65a18',
        },
        night: {
          500: '#1a2440',
          700: '#0f1628',
          900: '#070a16',
        },
      },
      fontFamily: {
        cozy: ['"Quicksand"', '"Nunito"', 'system-ui', 'sans-serif'],
        title: ['"Caveat"', '"Quicksand"', 'cursive'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 600ms ease-out both',
        'fade-up': 'fadeUp 700ms cubic-bezier(.2,.8,.2,1) both',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'shimmer': 'shimmer 6s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
