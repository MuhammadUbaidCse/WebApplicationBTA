/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#1a2744', 50: '#f0f2f8', 100: '#d9dfef', 500: '#1a2744', 600: '#15203a', 700: '#101930', 800: '#0b1120', 900: '#060a12' },
        teal:  { DEFAULT: '#0d9488', 50: '#f0fdfa', 100: '#ccfbf1', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
