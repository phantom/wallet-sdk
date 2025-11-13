import { defineConfig } from "tsup";

export default defineConfig([
  // Web build
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: {
      resolve: true,
    },
    sourcemap: false,
    clean: true,
    external: ["react", "react-dom"],
    esbuildOptions(options) {
      options.conditions = ["web"];
      options.resolveExtensions = [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js"];
    },
  },
  // React Native build
  {
    entry: ["src/index.ts"],
    format: ["cjs"],
    outExtension() {
      return {
        js: ".native.js",
      };
    },
    sourcemap: false,
    external: ["react", "react-native", "react-native-svg"],
    esbuildOptions(options) {
      options.conditions = ["react-native"];
      options.resolveExtensions = [".native.tsx", ".native.ts", ".tsx", ".ts", ".jsx", ".js"];
    },
  },
]);
