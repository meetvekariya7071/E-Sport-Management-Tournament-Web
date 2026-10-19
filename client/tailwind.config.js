/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gaming: {
          bg: '#0a0d14',
          surface: '#0f1422',
          card: '#161f33',
          cardHover: '#1c2742',
          border: '#1e293b',
          borderAccent: '#0284c7',
          neonCyan: '#00f0ff',
          neonBlue: '#3b82f6',
          neonPurple: '#8b5cf6',
          neonGreen: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b'
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(0, 240, 255, 0.3)',
        'glow-blue': '0 0 20px -3px rgba(59, 130, 246, 0.35)',
        'glow-purple': '0 0 20px -3px rgba(139, 92, 246, 0.35)',
        'glow-red': '0 0 20px -3px rgba(239, 68, 68, 0.35)',
      }
    },
  },
  plugins: [],
}
