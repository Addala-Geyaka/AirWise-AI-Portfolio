/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: { colors: { ink: "#24332f", leaf: "#31775f", mist: "#f2f5f1" } },
  },
  plugins: [],
};
