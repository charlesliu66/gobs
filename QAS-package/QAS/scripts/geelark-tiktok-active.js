#!/usr/bin/env node
/**
 * GeeLark TikTok 养号任务（task/add taskType=2 懒人养号）
 *
 * 用法：
 *   node geelark-tiktok-active.js --env "Test 3" [--action "browse video"] [--duration 15] [--keywords "gaming,viral"]
 *   node geelark-tiktok-active.js --env-ids "609149762754576432" --action "search video" --keywords "gaming"
 *
 * 参数：
 *   --env       设备名（如 "Test 3"），支持逗号分隔多设备
 *   --env-ids   云手机 ID，支持逗号分隔
 *   --action    养号行为：browse video（随机浏览）/ search video（搜索短视频）/ search profile（搜索个人主页）
 *               默认 browse video
 *   --keywords  搜索关键词，逗号分隔；search 行为时必填，browse 时可选
 *   --duration  浏览时长（分钟），默认 15
 *
 * 配置：config/geelark.json
 */

const { loadGeelarkConfig, resolveEnvIds, geelarkRequest } = require('./geelark-lib');

const TASK_ADD_URL = 'https://openapi.geelark.cn/open/v1/task/add';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { env: '', envIds: '', action: 'browse video', keywords: [], duration: 15 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && args[i + 1]) result.env = args[++i];
    else if (args[i] === '--env-ids' && args[i + 1]) result.envIds = args[++i];
    else if (args[i] === '--action' && args[i + 1]) result.action = args[++i];
    else if (args[i] === '--keywords' && args[i + 1]) result.keywords = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (args[i] === '--duration' && args[i + 1]) result.duration = Math.min(60, Math.max(1, parseInt(args[++i], 10) || 15));
  }
  return result;
}

async function main() {
  const { env, envIds, action, keywords, duration } = parseArgs();
  const cfg = loadGeelarkConfig();

  if (!cfg?.apiKey && !process.env.GEELARK_API_KEY) {
    console.error('请配置 config/geelark.json 中的 apiKey，或设置 GEELARK_API_KEY');
    process.exit(1);
  }
  if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
  if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;

  const envArg = envIds || env;
  const targetIds = resolveEnvIds(envArg, cfg);

  if (!targetIds.length) {
    console.error('请指定 --env（设备名）或 --env-ids（云手机ID）');
    process.exit(1);
  }

  const validActions = ['browse video', 'search video', 'search profile'];
  if (!validActions.includes(action)) {
    console.error('--action 需为: browse video / search video / search profile');
    process.exit(1);
  }

  if ((action === 'search video' || action === 'search profile') && !keywords.length) {
    console.error('search 行为需指定 --keywords（关键词，逗号分隔）');
    process.exit(1);
  }

  const scheduleAt = Math.floor(Date.now() / 1000) + 5;
  const list = targetIds.map((envId) => {
    const item = { scheduleAt, envId, action, duration };
    if (keywords.length) item.keywords = keywords;
    return item;
  });

  const body = {
    planName: `tiktok-active-${Date.now()}`,
    taskType: 2,
    list,
  };

  console.log('设备:', targetIds.length, '台', targetIds);
  console.log('行为:', action);
  console.log('时长:', duration, '分钟');
  if (keywords.length) console.log('关键词:', keywords.join(', '));
  console.log('');

  const res = await geelarkRequest(TASK_ADD_URL, body);
  const taskIds = res?.data?.taskIds || [];

  if (taskIds.length) {
    console.log('TikTok 养号任务已提交，共', taskIds.length, '个');
    taskIds.forEach((id, i) => console.log('  任务', i + 1, ':', id));
    console.log('\n查询状态: node scripts/geelark-query-tasks.js --ids ' + taskIds.join(','));
  } else {
    console.log('响应:', JSON.stringify(res, null, 2));
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
