import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeNetworkType = (value: string | undefined) => {
  if (value === 'main' || value === 'test' || value === 'solo') {
    return value
  }
  return 'main'
}

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const networkType = normalizeNetworkType(process.env.VITE_NETWORK)
const base =
  process.env.VITE_BASE_PATH ??
  (process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/')

export default defineConfig({
  base,
  define: {
    'process.env.NEXT_PUBLIC_NETWORK_TYPE': JSON.stringify(networkType),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
