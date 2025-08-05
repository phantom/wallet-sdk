import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [
    'react',
    'react-native',
    'expo-secure-store',
    'expo-web-browser',
    'expo-auth-session',
    'expo-router',
  ],
});