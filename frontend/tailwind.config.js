/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#061426',
        accentCyan: '#00E5FF',
        accentTeal: '#0EA5A4',
        accentViolet: '#7C3AED',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
        neon: '0 0 24px rgba(0,229,255,0.2)',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    },
  },
  plugins: [],
}

