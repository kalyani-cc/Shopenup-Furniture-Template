import { defineConfig } from "tsup"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ["./src/app.tsx"],
  format: ["cjs", "esm"],
  esbuildOptions(options) {
    options.alias = {
      "virtual:shopenup/forms": path.resolve(__dirname, "./src/virtual-stubs/forms.ts"),
      "virtual:shopenup/displays": path.resolve(__dirname, "./src/virtual-stubs/displays.ts"),
      "virtual:shopenup/routes": path.resolve(__dirname, "./src/virtual-stubs/routes.ts"),
      "virtual:shopenup/links": path.resolve(__dirname, "./src/virtual-stubs/links.ts"),
      "virtual:shopenup/menu-items": path.resolve(__dirname, "./src/virtual-stubs/menu-items.ts"),
      "virtual:shopenup/widgets": path.resolve(__dirname, "./src/virtual-stubs/widgets.ts"),
    }
  },
  tsconfig: "tsconfig.build.json",
  define: {
    __BASE__: JSON.stringify(process.env.VITE_SHOPENUP_BASE || "/"),
    __BACKEND_URL__: JSON.stringify(
      process.env.VITE_SHOPENUP_BACKEND_URL || "http://localhost:9000"
    ),
    __STOREFRONT_URL__: JSON.stringify(
      process.env.VITE_SHOPENUP_STOREFRONT_URL || "http://localhost:8000"
    ),
  },
  clean: true,
})
