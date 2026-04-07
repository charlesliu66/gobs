import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // 允许局域网访问
    // 仅写 nip.io 时，同事用 http://局域网IP:5173 会因 Host 校验失败打不开；开发环境放行全部主机名
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers.authorization;
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
          proxy.on('error', (err, _req, res) => {
            console.error('[Vite 代理] 无法连接后端 3001:', err.message);
            if (res && typeof (res as { headersSent?: boolean }).headersSent === 'boolean' && !(res as { headersSent: boolean }).headersSent) {
              (res as { writeHead: (code: number, headers: Record<string, string>) => void; end: (body: string) => void }).writeHead(502, { 'Content-Type': 'application/json' });
              (res as { end: (body: string) => void }).end(JSON.stringify({
                error: '后端未启动。请在 h5-video-tool-api 目录运行: npm run dev',
              }));
            }
          });
        },
      },
    },
  },
})
