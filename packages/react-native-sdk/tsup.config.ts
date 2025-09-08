import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react", "react-native", "expo-secure-store", "expo-web-browser", "expo-auth-session", "expo-router"],
  esbuildOptions(options) {
    // Read package version at build time
    const packageJson = require("./package.json");
    
    // Replace __SDK_VERSION__ with actual package version
    options.define = {
      ...options.define,
      __SDK_VERSION__: JSON.stringify(packageJson.version),
    };
  },
});
