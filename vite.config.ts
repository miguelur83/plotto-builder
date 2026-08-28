import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the static build works on GitHub Pages
// from any sub-path (that's where Kac's version lives too).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
