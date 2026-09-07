import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
const proxy = {
  "/api": { target: "http://localhost:8000", changeOrigin: true },
};
export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        painel: resolve(import.meta.dirname, "painel.html"),
        relatorio: resolve(import.meta.dirname, "relatorio.html"),
        relatorioRapido: resolve(import.meta.dirname, "relatorio-rapido.html"),
      },
    },
  },
  server: { host: "127.0.0.1", port: 3000, strictPort: true, proxy },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true, proxy },
});
