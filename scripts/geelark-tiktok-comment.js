#!/usr/bin/env node
/**
 * GeeLark TikTok 评论任务：在指定视频链接下发表评论（单设备）
 *
 * 用法：node geelark-tiktok-comment.js --link "https://vt.tiktok.com/xxx" --comment "It's so good" [--env "Test 3"]
 *
 * 多设备、多链接批量评论请用：node geelark-engage.js comment --links "url1,url2" --comment "xxx" --env "Test 1,Test 2"
 *
 * 配置：config/geelark.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const COMMENT_ASIA_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomCommentAsia';
const COMMENT_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomComment';
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
  let link = '';
  let comment = 'It\'s so good';
  let envName = 'Test 3';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--link' && args[i + 1]) link = args[i + 1];
    if (args[i] === '--comment' && args[i + 1]) comment = args[i + 1];
    if (args[i] === '--env' && args[i + 1]) envName = args[i + 1];
  }

  const cfg = loadGeelarkConfig();
  if (!cfg || !(cfg.apiKey || process.env.GEELARK_API_KEY)) {
    console.error('请配置 config/geelark.json 中的 apiKey');
    process.exit(1);
  }
  if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
  if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;

  const devices = cfg.devices || [];
  const device = devices.find((x) => (x.name || '').toLowerCase().includes((envName || '').toLowerCase()));
  if (!device) {
    console.error(`未找到设备 "${envName}"`);
    process.exit(1);
  }

  const scheduleAt = Math.floor(Date.now() / 1000) + 5; // 5 秒后执行
  const body = {
    name: 'TikTok评论',
    scheduleAt,
    id: device.id,
    useAi: 2,
    comment,
  };
  if (link) body.links = [link];

  const apiUrl = (device.region || '').includes('亚洲') || (device.region || '').includes('印尼') || (device.region || '').includes('印度')
    ? COMMENT_ASIA_URL
    : COMMENT_URL;

  console.log(`设备: ${device.name} (${device.id})`);
  console.log(`链接: ${link || '(未指定，将随机)'}`);
  console.log(`评论: ${comment}`);
  console.log('');

  const res = await geelarkRequest(apiUrl, body);
  const taskId = res.data?.taskId;
  if (taskId) {
    console.log('任务已提交成功');
    console.log(`任务ID: ${taskId}`);
    console.log('可通过 node geelark-query-tasks.js --env "' + device.name + '" 查看执行状态');
  } else {
    console.log('响应:', JSON.stringify(res, null, 2));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
