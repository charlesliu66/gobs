#!/usr/bin/env node
/**
 * GeeLark 查询指定云手机上的任务状态（含失败原因）
 *
 * 用法：node geelark-query-tasks.js --env "Test 3"
 *   或：node geelark-query-tasks.js --env-id 609149762754576432
 *   或：node geelark-query-tasks.js --task-id 610300916179927115  # 查询单个任务详情与日志
 *
 * 配置：config/geelark.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const HISTORY_URL = 'https://openapi.geelark.cn/open/v1/task/historyRecords';
const DETAIL_URL = 'https://openapi.geelark.cn/open/v1/task/detail';

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

const STATUS_MSG = { 1: '等待执行', 2: '执行中', 3: '任务完成', 4: '任务失败', 7: '已取消' };
const TASK_TYPE_MSG = { 1: '发布视频', 2: 'AI养号', 3: '发布图集', 4: 'TikTok登录', 6: '编辑资料', 42: '自定义' };

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
    console.error('请指定 --env "Test 3" 或 --env-id <云手机ID>');
    process.exit(1);
  }

  const d = devices.find((x) => x.id === targetEnvId);
  const label = d ? d.name : targetEnvId;
  console.log(`查询 ${label} 上 7 天内任务...\n`);

  const history = await geelarkRequest(HISTORY_URL, { size: 50 });
  const items = (history.data?.items || []).filter((t) => t.envId === targetEnvId);

  if (items.length === 0) {
    console.log('未找到相关任务');
    return;
  }

  for (const t of items.slice(0, 15)) {
    const typeName = TASK_TYPE_MSG[t.taskType] || `类型${t.taskType}`;
    const statusName = STATUS_MSG[t.status] ?? t.status;
    const time = t.scheduleAt ? new Date(t.scheduleAt * 1000).toLocaleString('zh-CN') : '-';
    console.log(`任务 ${t.id}`);
    console.log(`  类型: ${typeName} | 状态: ${statusName} | 计划: ${time}`);
    if (t.status === 4 && (t.failCode || t.failDesc)) {
      console.log(`  失败: [${t.failCode}] ${t.failDesc || '未知'}`);
    }
    if (t.cost != null) console.log(`  耗时: ${t.cost} 秒`);
    console.log('');
  }

  const failed = items.filter((t) => t.status === 4 && t.taskType === 4);
  if (failed.length > 0) {
    console.log('--- TikTok 登录失败任务详情 ---');
    for (const t of failed.slice(0, 3)) {
      try {
        const detail = await geelarkRequest(DETAIL_URL, { id: t.id });
        const d = detail.data || {};
        console.log(`\n任务 ${t.id}:`);
        console.log(`  failCode: ${d.failCode}, failDesc: ${d.failDesc}`);
        if (d.logs && d.logs.length) {
          console.log('  最近日志:');
          d.logs.slice(-5).forEach((l) => console.log('    ' + l));
        }
      } catch (e) {
        console.log(`  查询详情失败: ${e.message}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
