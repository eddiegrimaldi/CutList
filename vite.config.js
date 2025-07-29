import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './babylon.html'
      }
    }
  },
  server: {
    port: 8080,
    host: true
  }
})
