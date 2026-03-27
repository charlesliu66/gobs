#!/usr/bin/env node
/**
 * GeeLark 批量发布脚本
 * 支持本地视频直传 + 多渠道分发（TikTok/Instagram Reels/YouTube Shorts）
 * 支持 Facebook 自动评论
 *
 * 视频发布：node publish.js --videos "path1,url2" --env-id <ID> [--platforms tiktok,instagram,youtube] [--caption "文案"]
 * Facebook 评论：node publish.js --action fb-comment --post-address <帖子链接> --comments "评论1,评论2" --keywords "词1,词2" --env-id <ID>
 *
 * 环境变量：GEELARK_API_KEY（必需），GEELARK_ENV_ID（可选）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

/** 加载 geelark 配置：优先 GEELARK_CONFIG，其次 cwd、Desktop/cursor_try/QAS 下 config */
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
        if (!process.env.GEELARK_APP_ID && cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
        if (!process.env.GEELARK_ENV_IDS && cfg.defaultEnvIds?.length)
          process.env.GEELARK_ENV_IDS = cfg.defaultEnvIds.join(',');
        if (!process.env.GEELARK_LATEST_JSON && cfg.latestJsonPath)
          process.env.GEELARK_LATEST_JSON = cfg.latestJsonPath;
        return cfg;
      } catch (_) {}
    }
  }
  return null;
}

loadGeelarkConfig();

// open.geelark.cn/api - 通用接口
const API_BASE = process.env.GEELARK_API_BASE || 'https://open.geelark.cn/api';
// openapi.geelark.cn - 任务接口
const OPENAPI_BASE = process.env.GEELARK_OPENAPI_BASE || 'https://openapi.geelark.cn';
const TASK_ADD_URL = `${OPENAPI_BASE}/open/v1/task/add`;
const UPLOAD_GET_URL = `${OPENAPI_BASE}/open/v1/upload/getUrl`;
const MULTI_PLATFORM_URL = `${OPENAPI_BASE}/open/v1/rpa/task/multiPlatformVideoDistribution`;
const FB_AUTO_COMMENT_URL = `${OPENAPI_BASE}/open/v1/rpa/task/faceBookAutoComment`;
const PHONE_STATUS_URL = `${OPENAPI_BASE}/open/v1/phone/status`;
const PHONE_START_URL = `${OPENAPI_BASE}/open/v1/phone/start`;
const PHONE_STOP_URL = `${OPENAPI_BASE}/open/v1/phone/stop`;

const VIDEO_EXT_TO_TYPE = { mp4: 'mp4', mov: 'mov', avi: 'avi', mkv: 'mkv', wmv: 'wmv', flv: 'flv', webm: 'webm', mpeg: 'mpeg', mpg: 'mpg', '3gp': '3gp' };

/** 生成 UUID v4 */
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 生成 Key 验证的 sign：SHA256(appId + traceId + ts + nonce + ApiKey)， hex 大写 */
function keyAuthSign(appId, traceId, ts, nonce, apiKey) {
  const str = `${appId}${traceId}${ts}${nonce}${apiKey}`;
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex').toUpperCase();
}

/** 发起 GeeLark API 请求：Token 验证 或 Key 验证（当 GEELARK_APP_ID 存在时） */
function geelarkRequest(endpoint, body) {
  const traceId = uuid();
  const apiKey = process.env.GEELARK_API_KEY || '';
  const appId = process.env.GEELARK_APP_ID || '';
  const useKeyAuth = !!appId && !!apiKey;

  const headers = {
    'Content-Type': 'application/json',
    traceId,
  };
  if (useKeyAuth) {
    const ts = String(Date.now());
    const nonce = traceId.slice(0, 6);
    const sign = keyAuthSign(appId, traceId, ts, nonce, apiKey);
    headers.appId = appId;
    headers.ts = ts;
    headers.nonce = nonce;
    headers.sign = sign;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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
              reject(new Error(`GeeLark API 错误 [${json.code}]: ${json.msg || '未知错误'}`));
            } else {
              resolve(json);
            }
          } catch {
            resolve({ raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(typeof body === 'string' ? body : JSON.stringify(body || {}));
    req.end();
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    videos: [], platforms: [], caption: '', hashtags: '', envId: null, envIds: [], planName: '', useLatest: false, skipAutoStart: false, autoStopAfter: false,
    action: 'publish', postAddress: '', comments: [], keywords: [],
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--action' && args[i + 1]) {
      result.action = args[++i].trim().toLowerCase();
    } else if (args[i] === '--post-address' && args[i + 1]) {
      result.postAddress = args[++i].trim();
    } else if (args[i] === '--comments' && args[i + 1]) {
      result.comments = args[++i].split(/[,|]/).map((s) => s.trim()).filter(Boolean);
    } else if (args[i] === '--keywords' && args[i + 1]) {
      result.keywords = args[++i].split(/[,|]/).map((s) => s.trim()).filter(Boolean);
    } else if (args[i] === '--videos' && args[i + 1]) {
      result.videos = args[++i].split(',').map((p) => p.trim()).filter(Boolean);
    } else if (args[i] === '--platforms' && args[i + 1]) {
      result.platforms = args[++i].split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
    } else if (args[i] === '--caption' && args[i + 1]) {
      result.caption = args[++i];
    } else if (args[i] === '--hashtags' && args[i + 1]) {
      result.hashtags = args[++i];
    } else if ((args[i] === '--env-id' || args[i] === '--envId') && args[i + 1]) {
      result.envId = args[++i].trim();
    } else if (args[i] === '--env-ids' && args[i + 1]) {
      result.envIds = args[++i].split(',').map((p) => p.trim()).filter(Boolean);
    } else if (args[i] === '--plan-name' && args[i + 1]) {
      result.planName = args[++i].trim();
    } else if (args[i] === '--latest') {
      result.useLatest = true;
    } else if (args[i] === '--no-start') {
      result.skipAutoStart = true;
    } else if (args[i] === '--auto-stop') {
      result.autoStopAfter = true;
    }
  }
  return result;
}

/** 判断是否为 URL */
function isUrl(s) {
  return /^https?:\/\//i.test(String(s).trim());
}

/** 根据路径获取 fileType */
function getFileType(path) {
  const ext = (path.split(/[/\\]/).pop() || '').split('.').pop()?.toLowerCase();
  return VIDEO_EXT_TO_TYPE[ext] || 'mp4';
}

/** 上传本地文件到 GeeLark，返回 resourceUrl */
async function uploadLocalFile(localPath) {
  if (!fs.existsSync(localPath)) {
    throw new Error(`文件不存在：${localPath}`);
  }
  const fileType = getFileType(localPath);
  const res = await geelarkRequest(UPLOAD_GET_URL, { fileType });
  const { uploadUrl, resourceUrl } = res?.data || {};
  if (!uploadUrl || !resourceUrl) {
    throw new Error('获取上传地址失败，响应缺少 uploadUrl 或 resourceUrl');
  }
  await putFile(uploadUrl, localPath);
  return resourceUrl;
}

/** PUT 文件到指定 URL（不添加多余 Header） */
function putFile(url, localPath) {
  const timeoutMs = parseInt(process.env.GEELARK_UPLOAD_TIMEOUT, 10) || 300000; // 默认 5 分钟
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const fileStream = fs.createReadStream(localPath);
    const req = protocol.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'PUT',
        headers: { 'Content-Length': fs.statSync(localPath).size },
      },
      (res) => {
        fileStream.destroy();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          let body = '';
          res.on('data', (ch) => (body += ch));
          res.on('end', () => reject(new Error(`PUT 上传失败 [${res.statusCode}]: ${body || res.statusMessage}`)));
        }
      }
    );
    req.on('error', (err) => {
      fileStream.destroy();
      reject(err);
    });
    req.setTimeout(timeoutMs, () => {
      fileStream.destroy();
      req.destroy();
      reject(new Error(`上传超时（${timeoutMs / 1000}秒），请检查网络或增大 GEELARK_UPLOAD_TIMEOUT`));
    });
    fileStream.pipe(req);
  });
}

/** status: 0 已启动 1 启动中 2 已关闭 3 已过期 */
async function getPhoneStatus(ids) {
  const res = await geelarkRequest(PHONE_STATUS_URL, { ids });
  const details = res?.data?.successDetails || [];
  return Object.fromEntries(details.map((d) => [d.id, d.status]));
}

/** 确保云手机已启动，未启动则调用 start 并轮询直到就绪 */
async function ensurePhonesRunning(ids) {
  const statusMap = await getPhoneStatus(ids);
  const needStart = ids.filter((id) => statusMap[id] === 2);
  if (needStart.length > 0) {
    process.stderr.write(`正在启动 ${needStart.length} 台云手机：${needStart.join(', ')}\n`);
    await geelarkRequest(PHONE_START_URL, { ids: needStart });
  }
  const maxWait = 180000;
  const interval = 5000;
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    const map = await getPhoneStatus(ids);
    const pending = ids.filter((id) => map[id] !== 0 && map[id] !== 1);
    if (pending.length === 0) {
      process.stderr.write('云手机已就绪。\n');
      return;
    }
    const expired = ids.filter((id) => map[id] === 3);
    if (expired.length > 0) {
      throw new Error(`云手机已过期：${expired.join(', ')}`);
    }
    process.stderr.write(`等待云手机启动... (${pending.length} 台未就绪)\n`);
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('云手机启动超时');
}

/** 关闭云手机 */
async function stopPhones(ids) {
  process.stderr.write(`正在关闭 ${ids.length} 台云手机...\n`);
  await geelarkRequest(PHONE_STOP_URL, { ids });
}

/** 将视频列表解析为 URL 数组：本地路径先上传，URL 直接使用 */
async function resolveVideoUrls(videos) {
  const urls = [];
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i].trim();
    if (isUrl(v)) {
      urls.push(v);
    } else {
      process.stderr.write(`上传中 [${i + 1}/${videos.length}]: ${v}\n`);
      const resourceUrl = await uploadLocalFile(v);
      urls.push(resourceUrl);
    }
  }
  return urls;
}

async function main() {
  const apiKey = process.env.GEELARK_API_KEY;
  if (!apiKey) {
    console.error('错误：未设置 GEELARK_API_KEY 环境变量');
    console.error('请在 PowerShell 中执行：$env:GEELARK_API_KEY = "你的API密钥"');
    process.exit(1);
  }

  const { videos, platforms, caption, hashtags, envId, envIds, planName, useLatest, skipAutoStart, autoStopAfter, action, postAddress, comments, keywords } = parseArgs();
  const envIdFromEnv = process.env.GEELARK_ENV_ID;
  const envIdsFromEnv = process.env.GEELARK_ENV_IDS ? process.env.GEELARK_ENV_IDS.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const resolvedEnvIds = envIds.length ? envIds : (envIdsFromEnv.length ? envIdsFromEnv : envId || envIdFromEnv ? [envId || envIdFromEnv] : []);

  let resolvedVideos = videos;
  let resolvedCaption = caption;
  if (useLatest) {
    const latestPath = process.env.GEELARK_LATEST_JSON || 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos\\latest.json';
    if (!fs.existsSync(latestPath)) {
      console.error('错误：latest.json 不存在。请先运行 video-pipeline 生成视频。路径：', latestPath);
      process.exit(1);
    }
    const latest = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
    resolvedVideos = [latest.outputPath];
    if (!resolvedCaption && latest.prompt) {
      resolvedCaption = String(latest.prompt).slice(0, 4000);
    }
    console.log('已从 latest.json 读取成片：', latest.outputPath);
  }

  if (!resolvedEnvIds.length) {
    console.error('错误：缺少云手机 ID。请使用 --env-id 或 --env-ids 传入，或设置环境变量 GEELARK_ENV_ID / GEELARK_ENV_IDS');
    process.exit(1);
  }

  if (action === 'fb-comment') {
    if (!postAddress) {
      console.error('错误：Facebook 评论需指定 --post-address（帖子链接）');
      process.exit(1);
    }
    if (!comments.length) {
      console.error('错误：Facebook 评论需指定 --comments（逗号或竖线分隔，最多10条）');
      process.exit(1);
    }
    if (!keywords.length) {
      console.error('错误：Facebook 评论需指定 --keywords（逗号或竖线分隔，最多10个）');
      process.exit(1);
    }
    if (!skipAutoStart) {
      await ensurePhonesRunning(resolvedEnvIds);
    }
    const commentList = comments.slice(0, 10);
    const keywordList = keywords.slice(0, 10);
    const scheduleAt = Math.floor(Date.now() / 1000);
    const allTaskIds = [];
    for (const eid of resolvedEnvIds) {
      const body = { scheduleAt, id: eid, postAddress, comment: commentList, keyword: keywordList };
      const res = await geelarkRequest(FB_AUTO_COMMENT_URL, body);
      if (res?.data?.taskId) allTaskIds.push(res.data.taskId);
    }
    console.log('Facebook 自动评论任务已提交。任务 ID：', allTaskIds);
    console.log('请在 GeeLark 控制台查看执行状态。');
    return;
  }

  if (!resolvedVideos.length) {
    console.error('用法：node publish.js --videos "path1,url2" --env-id <ID> [--platforms tiktok,instagram,youtube] [--caption "文案"]');
    console.error('  或 Facebook 评论：--action fb-comment --post-address <帖子链接> --comments "评论1,评论2" --keywords "关键词1,关键词2"');
    console.error('  --videos        本地路径或 URL，逗号分隔');
    console.error('  --env-id/--env-ids  云手机 ID');
    console.error('  --action fb-comment  Facebook 自动评论模式');
    console.error('  --post-address  帖子链接（fb-comment 必填）');
    console.error('  --comments     评论内容，逗号或竖线分隔，最多10条（fb-comment 必填）');
    console.error('  --keywords     关键词，逗号或竖线分隔，最多10个（fb-comment 必填）');
    process.exit(1);
  }

  if (!skipAutoStart) {
    await ensurePhonesRunning(resolvedEnvIds);
  } else {
    process.stderr.write('跳过自动启动云手机（--no-start）\n');
  }

  const scheduleAt = Math.floor(Date.now() / 1000);
  const validPlatforms = platforms.filter((p) => ['tiktok', 'instagram', 'youtube', 'all'].includes(p));
  const useMultiPlatform = validPlatforms.length >= 2 || validPlatforms.includes('all');

  try {
    const videoUrls = await resolveVideoUrls(resolvedVideos);
    console.log('\n待发布视频 URL：', videoUrls);

    if (useMultiPlatform) {
      const title = [resolvedCaption, hashtags].filter(Boolean).join(' ').trim().slice(0, 100) || 'video';
      const allTaskIds = [];
      for (const eid of resolvedEnvIds) {
        const body = {
          scheduleAt,
          id: eid,
          title,
          video: videoUrls.slice(0, 10),
          ...(planName && { name: planName }),
        };
        const res = await geelarkRequest(MULTI_PLATFORM_URL, body);
        if (res?.data?.taskId) allTaskIds.push(res.data.taskId);
      }
      console.log('使用多渠道分发（TikTok + Instagram Reels + YouTube Shorts）');
      console.log('\n发布任务已提交。任务 ID：', allTaskIds);
    } else {
      const videoDesc = [resolvedCaption, hashtags].filter(Boolean).join('\n').trim().slice(0, 4000) || undefined;
      const list = [];
      for (const video of videoUrls) {
        for (const eid of resolvedEnvIds) {
          list.push({
            scheduleAt,
            envId: eid,
            video,
            ...(videoDesc && { videoDesc }),
          });
        }
      }
      if (list.length > 100) {
        console.error('任务数超过 100，请分批执行。当前：', list.length, '个任务（', videoUrls.length, '视频 ×', resolvedEnvIds.length, '台手机）');
        process.exit(1);
      }
      const body = {
        taskType: 1,
        list,
        ...(planName && { planName }),
      };
      console.log('使用 TikTok task/add，共', list.length, '个任务（', videoUrls.length, '视频 ×', resolvedEnvIds.length, '台手机）');
      const res = await geelarkRequest(TASK_ADD_URL, body);
      const taskIds = res?.data?.taskIds || [];
      console.log('\n发布任务已提交。任务 ID：', taskIds);
    }
    console.log('请在 GeeLark 控制台查看执行状态。');

    if (autoStopAfter) {
      await stopPhones(resolvedEnvIds);
    }
  } catch (err) {
    console.error('失败：', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
