import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: set base to repo name
  // Change this if your repo has a different name
  base: '/banzuke-app/',
  build: {
    outDir: 'dist',
    // Generate source maps for debugging production issues
    sourcemap: true,
    // Warn if chunks exceed this size (in kB)
    chunkSizeWarningLimit: 500,
    // Minification options
    minify: 'esbuild',
    // Rollup options for chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Separate React into its own chunk for better caching
          react: ['react', 'react-dom'],
        },
        // Asset file naming for cache busting
        assetFileNames: (assetInfo) => {
          // Keep fonts in assets folder without hash for consistency
          if (assetInfo.name?.endsWith('.otf') || assetInfo.name?.endsWith('.woff2')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: true,
  },
  // Development server configuration
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
})
