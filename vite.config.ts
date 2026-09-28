import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['events', 'crypto', 'stream', 'util', 'buffer'],
      globals: {
        Buffer: true,
        global: true,
      },
    }),
    wasm()
  ],
  build: {
    target: 'esnext'
  },
  resolve: {
    dedupe: ['@midnight-ntwrk/compact-js', '@midnight-ntwrk/compact-runtime']
  },
  define: {
    'process.env': {}
  }
})