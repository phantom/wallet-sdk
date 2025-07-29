// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom", "@phantom/react-sdk", "@phantom/client"],
  minify: true,
  sourcemap: true,
  // Include CSS files in the bundle
  loader: {
    ".css": "copy",
  },
});
