import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV || 'development'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split KaTeX into separate chunk (includes 63 font files)
          'katex': ['katex'],
          // Split markdown processing libraries
          'markdown': [
            'react-markdown',
            'rehype-katex',
            'remark-math',
            'remark-gfm',
            'rehype-raw'
          ],
          // Split syntax highlighting
          'syntax-highlighter': ['react-syntax-highlighter'],
          // Split React vendor code
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
        },
      },
    },
    // Increase chunk size warning limit since we're splitting intentionally
    chunkSizeWarningLimit: 1000,
  },
})
