import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    open: true,
  },
  define: {
    global: "globalThis",
    Buffer: "Buffer",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
});
