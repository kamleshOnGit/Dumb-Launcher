/** @type {import('tailwindcss').Config} */
module.exports = {
  // Added "./App.{js,jsx,ts,tsx}" and "./app/**/*.{js,jsx,ts,tsx}"
  content: [
    "./index.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'ink': '#000000',
        'paper': '#FFFFFF',
        'canvas': '#121212',
        'accent': '#3B82F6',
      },
    },
  },
  plugins: [],
};