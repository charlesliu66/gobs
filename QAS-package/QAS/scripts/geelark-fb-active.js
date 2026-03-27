#!/usr/bin/env node
/**
 * GeeLark Facebook 养号任务
 *
 * 用法：
 *   node geelark-fb-active.js --env "Test 3" --keywords "gold and glory,mobile legends" [--browse 20]
 *   node geelark-fb-active.js --env-id 609149762754576432 --keywords "gold and glory,mobile legends"
 *
 * 参数：
 *   --env      设备名（如 "Test 3"），支持逗号分隔多设备
 *   --env-id   云手机 ID，支持逗号分隔
 *   --keywords 搜索关键词，逗号分隔，最多 10 个
 *   --browse   预计浏览帖子数量，1-100，默认 20
 *
 * 配置：config/geelark.json
 */

const path = require('path');
const { loadGeelarkConfig, resolveEnvIds, geelarkRequest } = require('./geelark-lib');

const FB_ACTIVE_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/faceBookActiveAccount';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { env: '', envIds: '', keywords: [], browse: 20 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && args[i + 1]) result.env = args[++i];
    else if (args[i] === '--env-id' && args[i + 1]) result.envIds = args[++i];
    else if (args[i] === '--keywords' && args[i + 1]) result.keywords = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (args[i] === '--browse' && args[i + 1]) result.browse = Math.min(100, Math.max(1, parseInt(args[++i], 10) || 20));
  }
  return result;
}

async function main() {
  const { env, envIds, keywords, browse } = parseArgs();
  const cfg = loadGeelarkConfig();

  if (!cfg?.apiKey && !process.env.GEELARK_API_KEY) {
    console.error('请配置 config/geelark.json 中的 apiKey，或设置 GEELARK_API_KEY');
    process.exit(1);
  }

  let targetIds = [];
  if (envIds) {
    targetIds = envIds.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (env) {
    targetIds = resolveEnvIds(env, cfg);
  }

  if (!targetIds.length) {
    console.error('请指定 --env（设备名）或 --env-id（云手机ID）');
    process.exit(1);
  }

  if (!keywords.length) {
    console.error('请指定 --keywords（关键词，逗号分隔）');
    process.exit(1);
  }

  if (keywords.length > 10) {
    console.error('关键词最多 10 个，已截断');
    keywords.splice(10);
  }

  const scheduleAt = Math.floor(Date.now() / 1000) + 5;
  const taskIds = [];

  for (const id of targetIds) {
    const body = {
      name: 'Facebook养号',
      remark: keywords.join(', '),
      scheduleAt,
      id,
      browsePostsNum: browse,
      keyword: keywords,
    };
    const res = await geelarkRequest(FB_ACTIVE_URL, body);
    if (res?.data?.taskId) {
      taskIds.push(res.data.taskId);
      console.log(`设备 ${id}: 任务已提交，taskId=${res.data.taskId}`);
    }
  }

  if (taskIds.length) {
    console.log('\n任务已创建。查询状态: node scripts/geelark-query-tasks.js --ids ' + taskIds.join(','));
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
