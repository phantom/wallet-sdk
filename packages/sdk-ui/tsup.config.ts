import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "index.web": "src/index.web.ts",
    "index.native": "src/index.native.ts"
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react", "react-native", "react-dom"],
  splitting: false,
  sourcemap: true
});