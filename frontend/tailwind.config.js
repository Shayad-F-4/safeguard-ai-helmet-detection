/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safeguard: {
          darkest: '#07111F',
          dark: '#0B1628',
          card: '#0F1E36',
          cardElevated: '#142542',
          border: 'rgba(56, 114, 194, 0.18)',
          borderHover: 'rgba(56, 189, 248, 0.35)',
          electric: '#1677FF',
          blueGlow: '#2563EB',
          cyan: '#22D3EE',
          safe: '#22C55E',
          warning: '#F59E0B',
          violation: '#EF4444',
          muted: '#64748B',
          subtext: '#94A3B8',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(22, 119, 255, 0.25)',
        'glow': '0 0 20px rgba(22, 119, 255, 0.35)',
        'glow-cyan': '0 0 15px rgba(34, 211, 238, 0.3)',
        'glow-safe': '0 0 12px rgba(34, 197, 94, 0.3)',
        'glow-red': '0 0 12px rgba(239, 68, 68, 0.3)',
      },
    },
  },
  plugins: [],
}
