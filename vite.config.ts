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
  },
})
