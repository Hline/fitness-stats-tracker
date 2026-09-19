/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fitness: {
          dark: '#0f172a',
          card: '#1e293b',
          neon: '#10b981',
          cyan: '#06b6d4',
          orange: '#f97316',
          rose: '#f43f5e',
          purple: '#a855f7'
        }
      }
    },
  },
  plugins: [],
}
