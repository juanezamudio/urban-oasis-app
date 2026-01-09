/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Darker olive/sage palette
        sage: {
          50: '#f0f2ed',
          100: '#dce1d5',
          200: '#b8c4a8',
          300: '#95a67c',
          400: '#778a5a',
          500: '#5d6f45',
          600: '#4a5838',
          700: '#3b462d',
          800: '#2d3623',
          900: '#232a1b',
          950: '#151a10',
        },
        // Darker warm neutrals - olive undertones
        earth: {
          50: '#e8e6e1',
          100: '#d4d1c9',
          200: '#b8b4a8',
          300: '#9a9588',
          400: '#7a756a',
          500: '#5c584f',
          600: '#46433c',
          700: '#36342f',
          800: '#2a2825',
          900: '#1f1e1b',
          950: '#141311',
        },
      },
    },
  },
  plugins: [],
}
