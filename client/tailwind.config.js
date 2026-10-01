/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#e1e9f2',
          200: '#c5d5e5',
          300: '#99b8d2',
          400: '#6794bc',
          500: '#4676a3',
          600: '#345c85',
          700: '#2b4a6b',
          800: '#1b324b',
          900: '#0f2038',
          950: '#091527',
        },
        brand: {
          blue: '#0a192f',
          blueHover: '#132a4f',
          blueActive: '#071223',
          surface: '#f8fafc',
          border: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
