import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /banzuke-app/
  base: '/banzuke-app/',
  build: {
    outDir: 'dist',
    // Emit source maps for debugging without referencing them from the bundle
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 500,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Keep React in its own long-lived chunk
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
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
