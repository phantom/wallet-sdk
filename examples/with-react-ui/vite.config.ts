import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5178,
    open: true,
    host: "0.0.0.0", // Allow external connections
    allowedHosts: true, // Allow specific ngrok domain
    headers: {
      "ngrok-skip-browser-warning": "true", // Skip ngrok browser warning
    },
  },
});
