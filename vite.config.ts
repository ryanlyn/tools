import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [viteSingleFile()],
  root: 'src/claude-chat-analyzer',
  build: {
    outDir: '../../',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/claude-chat-analyzer/claude-chat-analyzer.html')
    }
  }
})
