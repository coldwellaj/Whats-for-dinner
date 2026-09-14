/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand scale built around the Rotisserie logo's burnt orange (600 = #c2410c,
        // the badge fill color).
        terracotta: {
          50: "#fdf1ec",
          100: "#fce0d4",
          200: "#f9c4ae",
          300: "#f69d79",
          400: "#f26d36",
          500: "#e64e0f",
          600: "#c2410c",
          700: "#99340a",
          800: "#76290a",
          900: "#57200a",
          950: "#311307",
        },
      },
    },
  },
  plugins: [],
};
