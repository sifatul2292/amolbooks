/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        bg: '#0f1117',
        card: '#1a1d2e',
      },
    },
  },
  plugins: [],
};
