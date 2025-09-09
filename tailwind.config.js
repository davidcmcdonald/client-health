/** @type {import('tailwindcss').Config} */
module.exports = {
  // Our theme toggle adds/removes the `dark` class on <html>
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}",
    "./pages/**/*.{js,jsx,ts,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
