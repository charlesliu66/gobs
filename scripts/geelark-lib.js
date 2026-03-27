#!/usr/bin/env node
/**
 * GeeLark 共享库：配置加载、请求、设备解析
 * 供 geelark-post、geelark-engage 等脚本共用
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const CONFIG_PATHS = [
  () => process.env.GEELARK_CONFIG,
  () => path.join(process.cwd(), 'config', 'geelark.json'),
  () => path.join(process.cwd(), '..', 'config', 'geelark.json'),
  () => path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'cursor_try', 'QAS', 'config', 'geelark.json'),
].filter(Boolean);

function loadGeelarkConfig() {
  for (const fn of CONFIG_PATHS) {
    const p = fn();
    if (p && fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (!process.env.GEELARK_API_KEY && cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;
        if (!process.env.GEELARK_APP_ID && cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
        return cfg;
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
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
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

/**
 * 解析设备参数为 envId 数组
 * @param {string} arg - 设备名（如 "Test 3"）或逗号分隔（"Test 1,Test 2,Test 3"）或 ID（"609149762754576432" 或 "id1,id2"）
 * @param {object} config - loadGeelarkConfig() 返回值
 * @returns {string[]} envId 数组
 */
function resolveEnvIds(arg, config) {
  if (!arg || !arg.trim()) return (config?.defaultEnvIds || []).slice();
  const parts = arg.split(',').map((s) => s.trim()).filter(Boolean);
  const devices = config?.devices || [];
  const result = [];
  for (const p of parts) {
    const byId = devices.find((d) => d.id === p);
    if (byId) {
      result.push(byId.id);
    } else {
      const byName = devices.find((d) => (d.name || '').toLowerCase().includes(p.toLowerCase()));
      if (byName) {
        result.push(byName.id);
      } else if (/^\d+$/.test(p)) {
        result.push(p);
      }
    }
  }
  return [...new Set(result)];
}

function isAsiaDevice(device) {
  const r = (device?.region || '');
  return r.includes('亚洲') || r.includes('印尼') || r.includes('印度');
}

module.exports = {
  loadGeelarkConfig,
  geelarkRequest,
  resolveEnvIds,
  isAsiaDevice,
  uuid,
};
