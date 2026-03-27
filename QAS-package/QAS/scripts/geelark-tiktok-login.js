#!/usr/bin/env node
/**
 * GeeLark 云手机 TikTok 登录脚本
 *
 * 用法：node geelark-tiktok-login.js [--limit 3] [--first N] [--env "Test 3"]
 *
 *   --limit N  使用前 N 台云手机（默认 3）
 *   --first N  使用前 N 个账号（默认按已注册筛选）
 *   --env "名称"  仅向指定云手机提交登录（如 --env "Test 3"），配合第一个已注册账号
 *
 * 账号与云手机按顺序一一对应。
 * 配置：config/geelark.json（apiKey、appId、devices）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const TIKTOK_LOGIN_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/tiktokLogin';

const ACCOUNTS_PATH = path.join(__dirname, 'tiktok-accounts.json');
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
  const limit = parseInt(process.argv.find((a) => a.startsWith('--limit'))?.split('=')[1] || '3', 10);

  const cfg = loadGeelarkConfig();
  if (!cfg || !(cfg.apiKey || process.env.GEELARK_API_KEY)) {
    console.error('请配置 config/geelark.json 中的 apiKey，或设置 GEELARK_API_KEY');
    process.exit(1);
  }
  if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
  if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;

  const devices = cfg.devices || cfg.defaultEnvIds?.map((id) => ({ id })) || [];
  const phoneIds = devices.map((d) => (typeof d === 'string' ? d : d.id)).filter(Boolean);
  if (phoneIds.length === 0) {
    console.error('config/geelark.json 中缺少 devices 或 defaultEnvIds');
    process.exit(1);
  }

  if (!fs.existsSync(ACCOUNTS_PATH)) {
    console.error('缺少 tiktok-accounts.json');
    process.exit(1);
  }
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf-8'));
  const registered = accounts.filter((a) => a.status === '已注册');
  const toLogin = registered.slice(0, limit);
  if (toLogin.length === 0) {
    console.log('没有已注册账号可登录');
    return;
  }
  if (toLogin.length > phoneIds.length) {
    console.log(`账号数(${toLogin.length}) > 云手机数(${phoneIds.length})，只登录前 ${phoneIds.length} 个`);
    toLogin.length = phoneIds.length;
  }

  console.log(`将 ${toLogin.length} 个账号登录到 GeeLark 云手机：`);
  toLogin.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.email} -> ${phoneIds[i]} (${devices[i]?.name || '云手机'})`);
  });

  const scheduleAt = Math.floor(Date.now() / 1000) + 10;
  const results = [];

  for (let i = 0; i < toLogin.length; i++) {
    const acc = toLogin[i];
    const phoneId = phoneIds[i];
    const body = {
      name: `TikTok登录_${acc.username || acc.email}`,
      scheduleAt: scheduleAt + i * 30,
      id: phoneId,
      account: acc.email,
      password: acc.password,
    };
    try {
      const res = await geelarkRequest(TIKTOK_LOGIN_URL, body);
      const taskId = res.data?.taskId;
      console.log(`  ✓ ${acc.email} -> taskId ${taskId}`);
      results.push({ email: acc.email, phoneId, taskId, ok: true });
    } catch (e) {
      console.log(`  ✗ ${acc.email}: ${e.message}`);
      results.push({ email: acc.email, phoneId, ok: false, err: e.message });
    }
    if (i < toLogin.length - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\n完成:', results.filter((r) => r.ok).length, '成功,', results.filter((r) => !r.ok).length, '失败');
  console.log('提示: 登录任务会在云手机中自动执行，可在 GeeLark 客户端查看进度。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
