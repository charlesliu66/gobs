#!/usr/bin/env node
/**
 * GeeLark 创建云手机（创号）
 * 用法：node geelark-create-phone.js --name DDYS5 [--region sgp] [--android 15] [--proxy-number N]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const ADD_NEW_URL = 'https://openapi.geelark.cn/open/v1/phone/addNew';
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'geelark.json');

function loadGeelarkConfig() {
  const base = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    process.env.GEELARK_CONFIG,
    CONFIG_PATH,
    path.join(process.cwd(), 'config', 'geelark.json'),
    path.join(base, 'Desktop', 'cursor_try', 'QAS', 'config', 'geelark.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
        if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;
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
  const traceId = uuid();
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
              reject(new Error(`GeeLark API [${json.code}]: ${json.msg || '未知错误'}`));
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

function parseArgs() {
  const args = process.argv.slice(2);
  let name = 'DDYS5';
  let region = 'sgp';
  let android = '15';
  let proxyNumber = null;
  let proxy = process.env.GEELARK_PROXY || null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
    else if (args[i] === '--region' && args[i + 1]) region = args[++i];
    else if (args[i] === '--android' && args[i + 1]) android = args[++i];
    else if (args[i] === '--proxy-number' && args[i + 1]) proxyNumber = parseInt(args[++i], 10);
    else if (args[i] === '--proxy' && args[i + 1]) proxy = args[++i];
  }
  return { name, region, android, proxyNumber, proxy };
}

async function main() {
  const { name, region, android, proxyNumber, proxy } = parseArgs();

  const cfg = loadGeelarkConfig();
  if (!cfg || !(cfg.apiKey || process.env.GEELARK_API_KEY)) {
    console.error('请配置 config/geelark.json 中的 apiKey、appId');
    process.exit(1);
  }

  const mobileType = `Android ${android}`;
  const dataItem = { profileName: name, mobileLanguage: 'default' };
  if (proxyNumber != null) dataItem.proxyNumber = proxyNumber;
  if (proxy) dataItem.proxyInformation = proxy;

  const body = {
    mobileType,
    chargeMode: 0,
    region,
    data: [dataItem],
  };

  console.log('正在创建云手机:', name);
  console.log('  mobileType:', mobileType, '| region:', region);

  try {
    const res = await geelarkRequest(ADD_NEW_URL, body);
    const details = res?.data?.details || [];
    const ok = details.filter((d) => d.code === 0);
    if (ok.length === 0) {
      const err = details[0];
      console.error('创建失败:', err?.msg || JSON.stringify(details));
      process.exit(1);
    }
    for (const d of ok) {
      console.log('\n✓ 创建成功');
      console.log('  云手机ID:', d.id);
      console.log('  名称:', d.profileName || name);
      if (d.equipmentInfo) {
        console.log('  国家:', d.equipmentInfo.countryName);
        console.log('  手机号:', d.equipmentInfo.phoneNumber);
      }
      console.log('\n可将以下内容添加到 config/geelark.json 的 devices 数组:');
      console.log(JSON.stringify({ id: d.id, name, region: '待填写' }, null, 2));
    }
  } catch (err) {
    console.error('失败:', err.message);
    if (/proxy/i.test(err.message)) {
      console.error('\n提示：GeeLark 创号需要代理。可选：');
      console.error('  1) 在 GeeLark 控制台添加代理后，使用 --proxy-number 1（序号）');
      console.error('  2) 或传入 --proxy "socks5://user:pass@host:port"');
      console.error('  3) 或设置环境变量 GEELARK_PROXY');
    }
    process.exit(1);
  }
}

main();
