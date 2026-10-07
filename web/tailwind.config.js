/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // US flag palette — Old Glory Blue / Old Glory Red
        usa: {
          navy: "#0A3161",
          navyDark: "#071E3E",
          red: "#B31942",
          redDark: "#8A122E",
        },
        brand: {
          50: "#E8EDF3",
          100: "#D5DDE8",
          500: "#1A4A8A",
          600: "#0A3161",
          700: "#0A3161",
        },
      },
    },
  },
  plugins: []
};
