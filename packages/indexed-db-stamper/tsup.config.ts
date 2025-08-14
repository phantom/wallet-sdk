import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["buffer", "@phantom/base64url", "@phantom/crypto"],
  target: "es2020",
  platform: "browser",
});
