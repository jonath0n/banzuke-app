import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serviceWorker } from './scripts/lib/vite-plugin-sw.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
  // GitHub Pages serves the site from /banzuke-app/
  base: '/banzuke-app/',
  build: {
    outDir: 'dist',
    // Emit source maps for debugging without referencing them from the bundle
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Keep React in its own long-lived chunk. Vite 8 bundles with Rolldown,
        // whose chunking is `codeSplitting`; the object-form `manualChunks`
        // it replaced is rejected outright ("manualChunks is not a function").
        codeSplitting: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }],
        },
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    // The Playwright spec runs under its own runner, not Vitest
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    setupFiles: './src/setupTests.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'scripts/lib/**/*.ts'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.d.ts', '**/*.test.*'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    open: !process.env.CI,
  },
})
