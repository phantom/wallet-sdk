import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  clean: true,
  external: [
    '@phantom/api-key-stamper',
    '@phantom/client',
  ],
  platform: 'browser',
  shims: true,
  esbuildOptions(options) {
    options.packages = 'external';
  },
});