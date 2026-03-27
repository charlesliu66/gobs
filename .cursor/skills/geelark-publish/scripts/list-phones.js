#!/usr/bin/env node
/** 获取云手机列表，用于查找 envId */
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const OPENAPI_BASE = process.env.GEELARK_OPENAPI_BASE || 'https://openapi.geelark.cn';
const PHONE_LIST_URL = `${OPENAPI_BASE}/open/v1/phone/list`;

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function geelarkRequest(url, body) {
  const traceId = uuid();
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = (urlObj.protocol === 'https:' ? https : http).request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          traceId,
          Authorization: `Bearer ${process.env.GEELARK_API_KEY}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (ch) => (data += ch));
        res.on('end', () => {
          try {
            const json = JSON.parse(data || '{}');
            if (json.code !== undefined && json.code !== 0) {
              reject(new Error(`API [${json.code}]: ${json.msg}`));
            } else {
              resolve(json);
            }
          } catch {
            reject(new Error('解析响应失败'));
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
  if (!process.env.GEELARK_API_KEY) {
    console.error('请设置 GEELARK_API_KEY');
    process.exit(1);
  }
  const res = await geelarkRequest(PHONE_LIST_URL, { page: 1, pageSize: 100 });
  const items = res?.data?.items || [];
  if (items.length === 0) {
    console.log('暂无云手机');
    return;
  }
  console.log(`共 ${items.length} 台云手机：\n`);
  items.forEach((p, i) => {
    const status = [,'已启动','启动中','已关机'][p.status] || p.status;
    console.log(`${i + 1}. ${p.serialName || '-'} | id: ${p.id} | ${status}`);
  });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
