#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

function loadGeelarkConfig() {
  const base = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    process.env.GEELARK_CONFIG,
    path.join(process.cwd(), 'config', 'geelark.json'),
    path.join(process.cwd(), '..', 'config', 'geelark.json'),
    path.join(base, 'Desktop', 'cursor_try', 'QAS', 'config', 'geelark.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (!process.env.GEELARK_API_KEY && cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;
      } catch (_) {}
    }
  }
}

loadGeelarkConfig();

const ids = process.argv.slice(2).filter(Boolean) || [
  '610175069141860410', '610175069141925946', '610175069141991482',
  '610175069142057018', '610175069142122554', '610175069142188090'
];
const OPENAPI_BASE = process.env.GEELARK_OPENAPI_BASE || 'https://openapi.geelark.cn';
const TASK_QUERY_URL = `${OPENAPI_BASE}/open/v1/task/query`;
const TASK_HISTORY_URL = `${OPENAPI_BASE}/open/v1/task/historyRecords`;

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function geelarkRequest(endpoint, body) {
  const traceId = uuid();
  const apiKey = process.env.GEELARK_API_KEY || '';
  return new Promise((resolve, reject) => {
    const urlObj = new URL(endpoint);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        traceId,
        Authorization: `Bearer ${apiKey}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          if (json.code !== undefined && json.code !== 0) reject(new Error(`API [${json.code}]: ${json.msg}`));
          else resolve(json);
        } catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body || {}));
    req.end();
  });
}

const STATUS = { 1: '等待执行', 2: '执行中', 3: '任务完成', 4: '任务失败', 7: '已取消' };

(async () => {
  if (!process.env.GEELARK_API_KEY) {
    console.error('请设置 GEELARK_API_KEY');
    process.exit(1);
  }
  const res = await geelarkRequest(TASK_HISTORY_URL, { ids, size: 100 });
  const items = res?.data?.items || [];
  console.log('\n任务状态：\n');
  items.forEach((t) => {
    const st = STATUS[t.status] || `status=${t.status}`;
    console.log(`  ${t.id}  ${t.serialName || t.envId}  ${st}${t.failDesc ? ' - ' + t.failDesc : ''}${t.shareLink ? '  ' + t.shareLink : ''}`);
  });
  const done = items.filter((t) => t.status === 3).length;
  const fail = items.filter((t) => t.status === 4).length;
  console.log(`\n完成 ${done}/${items.length}，失败 ${fail}`);
})();
