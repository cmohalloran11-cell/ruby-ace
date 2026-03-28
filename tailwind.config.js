/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './contexts/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow', 'sans-serif'],
        condensed: ['Barlow Condensed', 'sans-serif'],
      },
      colors: {
        black: {
          950: '#080808',
          900: '#0e0e0e',
          800: '#141414',
          700: '#1a1a1a',
          600: '#242424',
        },
        ruby: {
          900: '#1a0508',
          800: '#2d0810',
          700: '#3d0d16',
          600: '#6b1526',
          500: '#9b1c35',
          400: '#c41e3a',
          300: '#e02247',
          200: '#f06070',
          100: '#fca5b0',
        },
      },
    },
  },
  plugins: [],
};
