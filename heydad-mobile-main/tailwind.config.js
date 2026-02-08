/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './app/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        "merriweather": ["merriweather"],
        "merriweatherSemibold": ["merriweatherSemibold"],
        "merriweatherBold": ["merriweatherBold"]
      }
    },
  },
  plugins: [],
  corePlugins: {
    backgroundOpacity: true
  }
};
