/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy brand aliases (keep for compatibility)
        'warp-green': '#00ff33',
        'warp-dark': '#121212',
        'warp-cyan': '#3ad6ff',
        'warp-purple': '#b084ff',
        'warp-neutral': '#9aa0a6',
        // Design token aliases powered by CSS variables
        'bg': 'var(--bg)',
        'accent': 'var(--accent)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'brd-1': 'var(--brd-1)',
        'brd-2': 'var(--brd-2)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        'elev-1': '0 2px 12px rgba(0,0,0,0.35)',
        'elev-2': '0 8px 28px rgba(0,0,0,0.45)',
        'glow-accent': '0 0 0 1px rgba(0,255,51,0.16), 0 8px 24px rgba(0,255,51,0.08)'
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'dash-move': 'dashMove 3s linear infinite',
        'truck-move': 'truckMove 4s ease-in-out infinite',
      },
      keyframes: {
        dashMove: {
          '0%': { 'stroke-dashoffset': '18' },
          '100%': { 'stroke-dashoffset': '0' },
        },
        truckMove: {
          '0%': { 'offset-distance': '0%' },
          '50%': { 'offset-distance': '50%' },
          '100%': { 'offset-distance': '100%' },
        }
      }
    },
  },
  plugins: [],
}
