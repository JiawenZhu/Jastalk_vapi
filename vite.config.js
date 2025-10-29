import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3002,
        open: true,
        host: true,
        proxy: {
            // Route API to either local relay (8787) or vercel dev (3000) when PROXY_VERCEL=1
            '/api/pipecat': {
                target: process.env.PROXY_VERCEL ? 'http://127.0.0.1:3000' : 'http://127.0.0.1:8787',
                changeOrigin: true,
            },
            // Local Pipecat runner (SmallWebRTC) offer endpoint
            '/api/offer': {
                target: 'http://127.0.0.1:7860',
                changeOrigin: true,
            },
        }
    },
    define: {
        global: 'globalThis',
    },
    esbuild: {
        loader: 'jsx',
        include: /src\/.*\.[jt]sx?$/,
        exclude: []
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    build: {
        outDir: 'dist'
    }
})
