/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F2A30',
        muted: '#4C666B',
        mist: '#EEF4F3',
        line: '#D3E1DF',
        peacock: { DEFAULT: '#0B6E73', deep: '#08474B', soft: '#D6EBEA' },
        marigold: { DEFAULT: '#F5B301', deep: '#D99F00', soft: '#FFF1C7' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
