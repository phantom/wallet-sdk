import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: "./",
  base: "/",
  server: {
    open: true,
  },
  resolve: {
    alias: {
      "@phantom/wallet-sdk": path.resolve(__dirname, "../../packages/browser-embedded-sdk/src/index.ts"),
    },
  },
  optimizeDeps: {
    include: ["@phantom/wallet-sdk"],
  },
});
