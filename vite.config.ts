import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const root = import.meta.dirname

/**
 * The site is a single page. Vercel serves dist/404.html with a 404 status for
 * unknown paths; this plugin gives the dev and preview servers the same behavior
 * instead of falling back to the homepage.
 */
function notFoundPage(): Plugin {
  const handler = (directory: string, render: (url: string, html: string) => Promise<string> | string) =>
    async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
      // Existing HTML pages (index.html, 404.html) continue to Vite's own handlers.
      if ((req.method !== 'GET' && req.method !== 'HEAD') || (pathname.endsWith('.html') && existsSync(join(directory, pathname)))) {
        next()
        return
      }
      try {
        const html = await render(req.url ?? '/', await readFile(join(directory, '404.html'), 'utf8'))
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      } catch (error) {
        next(error)
      }
    }

  return {
    name: 'not-found-page',
    configureServer(server) {
      return () => server.middlewares.use(handler(root, (url, html) => server.transformIndexHtml(url, html)))
    },
    configurePreviewServer(server) {
      return () => server.middlewares.use(handler(join(root, 'dist'), (_url, html) => html))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  appType: 'mpa',
  plugins: [react(), notFoundPage()],
  build: {
    rollupOptions: {
      input: {
        main: join(root, 'index.html'),
        notFound: join(root, '404.html'),
      },
    },
  },
})
