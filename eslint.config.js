import { defineConfig } from '@king-3/eslint-config'

export default defineConfig(
  {
    typescript: true
  },
  {
    files: ['**/*.md'],
    rules: {
      'import/first': 'off'
    }
  }
)
