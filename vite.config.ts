import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "ui",
  plugins: [viteSingleFile()],
  server: { port: 5173, fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true, target: "esnext" },
});
