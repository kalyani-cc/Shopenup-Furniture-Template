const path = require("path")

// get the path of the dependency "@shopenup/ui"
const shopenupUI = path.join(
  path.dirname(require.resolve("@shopenup/ui")),
  "**/*.{js,jsx,ts,tsx}"
)

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@shopenup/ui-preset")],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", shopenupUI],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
}
