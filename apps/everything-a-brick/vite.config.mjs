import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const appDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appDir,
  base: "./",
  build: {
    outDir: resolve(appDir, "../../build/everything-a-brick"),
    emptyOutDir: true
  },
  server: {
    port: 5174,
    strictPort: true
  },
  preview: {
    port: 4174,
    strictPort: true
  }
});
