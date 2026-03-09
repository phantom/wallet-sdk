import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020",
  outDir: "dist",
  external: ["@phantom/openapi-wallet-service", "axios", "bs58", "buffer"],
});
