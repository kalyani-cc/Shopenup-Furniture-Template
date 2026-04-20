# Shopenup_Admin

## Installation

```bash
npm install @shopenup/dashboard
# or
yarn add @shopenup/dashboard
```

## Usage

### 1. Import the CSS file

In your main app entry point (e.g., `main.tsx`, `App.tsx`, or `index.tsx`), import the CSS:

```tsx
import "@shopenup/dashboard/css";
```

### 2. Use the Dashboard Component

```tsx
import App from "@shopenup/dashboard";

function MyApp() {
  return <App plugins={[]} />;
}
```

### 3. Font Files

The package includes custom fonts (Inter and Roboto Mono). The font files are located in `node_modules/@shopenup/dashboard/dist/assets/fonts/`. 

If you're using a bundler (Vite, Webpack, etc.), make sure it can resolve these font files. The CSS references them with relative paths that should work when the package is installed.

### 4. Tailwind CSS Configuration (Optional)

If your consuming app uses Tailwind CSS and you want to extend the dashboard's Tailwind configuration, you can reference the dashboard's Tailwind config:

```js
// tailwind.config.js
module.exports = {
  presets: [
    require("@shopenup/ui-preset"), // Required preset
  ],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@shopenup/dashboard/dist/**/*.{js,mjs}", // Include dashboard components
  ],
  // ... rest of your config
};
```

## Build

To build the package:

```bash
npm run build
```

This will:
1. Build the TypeScript code with `tsup`
2. Build and minify the CSS with Tailwind CLI
3. Generate TypeScript definitions

## Development

```bash
npm run dev
```