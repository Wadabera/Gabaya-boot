/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        telegram: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(34, 197, 94, 0.45)',
        'glow-lg': '0 0 35px -2px rgba(34, 197, 94, 0.55)',
        'glow-blue': '0 0 25px -4px rgba(14, 165, 233, 0.45)',
        'glow-amber': '0 0 25px -4px rgba(245, 158, 11, 0.45)',
        'glow-purple': '0 0 25px -4px rgba(168, 85, 247, 0.4)',
        'card-lift': '0 16px 32px -10px rgba(0, 0, 0, 0.08), 0 0 16px -2px rgba(34, 197, 94, 0.12)',
        'soft-xl': '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.9, transform: 'scale(1.03)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px -3px rgba(34, 197, 94, 0.4)' },
          '50%': { boxShadow: '0 0 30px 2px rgba(34, 197, 94, 0.7)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
