import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  esbuildOptions(options) {
    // Enable JSON imports
    options.loader = {
      ...options.loader,
      ".json": "json",
    };
  },
});
