#!/usr/bin/env node
/**
 * GeeLark 取消指定云手机上的自动化任务
 *
 * 用法：node geelark-cancel-task.js --env "Test 2"
 *   或：node geelark-cancel-task.js --env-id 609149209844645936
 *
 * 配置：config/geelark.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const HISTORY_URL = 'https://openapi.geelark.cn/open/v1/task/historyRecords';
const CANCEL_URL = 'https://openapi.geelark.cn/open/v1/task/cancel';

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'geelark.json');

function loadGeelarkConfig() {
  for (const p of [CONFIG_PATH, path.join(process.cwd(), 'config', 'geelark.json')]) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (_) {}
    }
  }
  return null;
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function keyAuthSign(appId, traceId, ts, nonce, apiKey) {
  const str = `${appId}${traceId}${ts}${nonce}${apiKey}`;
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex').toUpperCase();
}

function geelarkRequest(url, body) {
  const traceId = uuid().replace(/-/g, '').toUpperCase();
  const apiKey = process.env.GEELARK_API_KEY || '';
  const appId = process.env.GEELARK_APP_ID || '';
  const useKeyAuth = !!appId && !!apiKey;

  const headers = { 'Content-Type': 'application/json', traceId };
  if (useKeyAuth) {
    const ts = String(Date.now());
    const nonce = traceId.slice(0, 6);
    headers.appId = appId;
    headers.ts = ts;
    headers.nonce = nonce;
    headers.sign = keyAuthSign(appId, traceId, ts, nonce, apiKey);
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = (urlObj.protocol === 'https:' ? https : http).request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (ch) => (data += ch));
        res.on('end', () => {
          try {
            const json = JSON.parse(data || '{}');
            if (json.code !== undefined && json.code !== 0) {
              reject(new Error(`GeeLark [${json.code}]: ${json.msg || '未知'}`));
            } else {
              resolve(json);
            }
          } catch {
            reject(new Error('响应解析失败: ' + data));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(JSON.stringify(body || {}));
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  let targetEnvId = null;
  let targetName = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env-id' && args[i + 1]) targetEnvId = args[i + 1];
    if (args[i] === '--env' && args[i + 1]) targetName = args[i + 1];
  }

  const cfg = loadGeelarkConfig();
  if (!cfg || !(cfg.apiKey || process.env.GEELARK_API_KEY)) {
    console.error('请配置 config/geelark.json 中的 apiKey');
    process.exit(1);
  }
  if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
  if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;

  const devices = cfg.devices || [];
  if (!targetEnvId && targetName) {
    const d = devices.find((x) => (x.name || '').toLowerCase().includes((targetName || '').toLowerCase()));
    if (d) targetEnvId = d.id;
  }
  if (!targetEnvId) {
    console.error('请指定 --env "Test 2" 或 --env-id <云手机ID>');
    process.exit(1);
  }

  console.log('查询 Test 2 上的任务...');
  const history = await geelarkRequest(HISTORY_URL, { size: 100 });
  const items = history.data?.items || [];
  const running = items.filter(
    (t) => t.envId === targetEnvId && (t.status === 1 || t.status === 2)
  );

  if (running.length === 0) {
    console.log('Test 2 上没有等待或执行中的任务');
    return;
  }

  const ids = running.map((t) => t.id);
  console.log(`找到 ${ids.length} 个任务，正在取消:`, ids);
  const res = await geelarkRequest(CANCEL_URL, { ids });
  const d = res.data || {};
  console.log(`完成: 成功 ${d.successAmount ?? 0}, 失败 ${d.failAmount ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
