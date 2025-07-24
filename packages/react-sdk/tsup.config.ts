import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@phantom/api-key-stamper',
    '@phantom/browser-injected-sdk',
    '@phantom/client',
  ],
  noExternal: [],
  platform: 'browser',
  shims: true,
});