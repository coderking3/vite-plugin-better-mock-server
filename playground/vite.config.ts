import { defineConfig } from 'vite'

import mockServer from '../src/index'

export default defineConfig({
  plugins: [
    mockServer({
      mockDir: 'mock',
      prefix: '/api',
      logger: true
    })
  ],
  server: {
    port: 3000
  }
})
