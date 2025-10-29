/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      colors: {
        jastalk: {
          purple: {
            light: '#667eea',
            DEFAULT: '#6366f1',
            dark: '#764ba2',
          }
        }
      }
    },
  },
  plugins: [],
}
