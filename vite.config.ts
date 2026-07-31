/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: 'fotos/*', dest: '.' },
        { src: 'fotos/splash/*', dest: '.' },
        { src: 'fotos/capturas/*', dest: '.' },
        { src: 'fotos/marketing/*', dest: '.' },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fotos/favicon-32.png'],
      manifest: {
        id: '/',
        name: 'SpiderPOS',
        short_name: 'SpiderPOS',
        description: 'La telaraña que conecta todo tu negocio — POS multi-tenant offline-first.',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es-MX',
        icons: [
          { src: '/fotos/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/fotos/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/fotos/icono-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
