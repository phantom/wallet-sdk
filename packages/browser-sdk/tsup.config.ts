// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from "tsup";
import packageJson from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
  },
  clean: true,
  external: ["@phantom/api-key-stamper", "@phantom/client"],
  platform: "browser",
  shims: true,
  esbuildOptions(options) {
    options.packages = "external";

    // Add buffer polyfill for browser compatibility and SDK version replacement
    options.define = {
      ...options.define,
      global: "globalThis",
      __SDK_VERSION__: JSON.stringify(packageJson.version),
    };
  },
});
