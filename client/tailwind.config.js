/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand scale built around the logo's olive green (600 = #5c6b2f, the plate badge color).
        olive: {
          50: "#f6f7f3",
          100: "#e9ecdf",
          200: "#d4dbbd",
          300: "#bbc892",
          400: "#9fb45f",
          500: "#7c9041",
          600: "#5c6b2f",
          700: "#495625",
          800: "#3a441d",
          900: "#2e3617",
          950: "#1c210d",
        },
        // Accent from the logo's checkmark badge.
        terracotta: {
          50: "#fdf3ee",
          100: "#fbe1d3",
          500: "#e15f21",
          600: "#c2410c",
          700: "#9a350f",
        },
      },
    },
  },
  plugins: [],
};
