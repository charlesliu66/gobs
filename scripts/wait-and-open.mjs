/**
 * 仅等待 GOBS 前端（Vite :5173）可访问即打开浏览器。
 * 不再等待矩阵 :3000：矩阵若未起，TikTok 矩阵页 iframe 会稍后加载，避免因 3000 卡住或失败而拖垮整组进程。
 */
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';

function waitTcp(port, host = '127.0.0.1', timeoutMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`等待端口 ${port} 超时`));
        return;
      }
      const socket = net.connect({ port, host }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}

/** 等到 Vite 真正返回 HTTP（避免仅端口打开但尚未就绪） */
function waitViteHttp(timeoutMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Vite HTTP 就绪超时'));
        return;
      }
      const req = http.get('http://127.0.0.1:5173/', { timeout: 5000 }, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => setTimeout(tryOnce, 500));
      req.on('timeout', () => {
        req.destroy();
        setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
  } else {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(opener, [url], { detached: true, stdio: 'ignore' });
  }
}

async function main() {
  await waitTcp(5173);
  await waitViteHttp();
  const urls = ['http://127.0.0.1:5173/', 'http://localhost:5173/'];
  openBrowser(urls[0]);
  console.log('[open] 已尝试打开浏览器 →', urls[0], '（若仍空白可试', urls[1], '）');
  await new Promise(() => {});
}

main().catch((e) => {
  console.error('[wait-and-open]', e.message);
  console.error('[wait-and-open] 请手动在浏览器打开 http://127.0.0.1:5173/（api / 矩阵 / Vite 仍在运行）');
  return new Promise(() => {});
});
