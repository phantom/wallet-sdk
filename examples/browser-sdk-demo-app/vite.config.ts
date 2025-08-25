import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5175, // Different port from the other demo app
    open: true,
  },
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
});
