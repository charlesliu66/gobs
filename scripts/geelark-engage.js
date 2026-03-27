#!/usr/bin/env node
/**
 * GeeLark TikTok 互动任务：批量评论、随机点赞
 *
 * 用法：
 *   批量评论（指定链接）：
 *     node geelark-engage.js comment --links "url1,url2" --comment "It's so good" --env "Test 3"
 *     node geelark-engage.js comment --links "url1" --comment "xxx" --env "Test 1,Test 2,Test 3"
 *
 *   随机点赞（⚠️ GeeLark API 不支持指定链接点赞，仅支持随机点赞）：
 *     node geelark-engage.js like --env "Test 3"
 *     node geelark-engage.js like --env "Test 1,Test 2,Test 3"
 *
 * 配置：config/geelark.json
 */

const { loadGeelarkConfig, resolveEnvIds, geelarkRequest, isAsiaDevice } = require('./geelark-lib');

const COMMENT_ASIA_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomCommentAsia';
const COMMENT_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomComment';
const LIKE_ASIA_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomStarAsia';
const LIKE_URL = 'https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomStar';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { subcmd: '', links: [], comment: "It's so good", env: '', envIds: '' };
  result.subcmd = (args[0] || '').toLowerCase();
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--links' && args[i + 1]) {
      result.links = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (args[i] === '--comment' && args[i + 1]) {
      result.comment = args[++i];
    } else if (args[i] === '--env' && args[i + 1]) {
      result.env = args[++i];
    } else if (args[i] === '--env-ids' && args[i + 1]) {
      result.envIds = args[++i];
    }
  }
  return result;
}

async function runComment(cfg, envIds, links, comment) {
  const devices = cfg.devices || [];
  const taskIds = [];
  const scheduleAt = Math.floor(Date.now() / 1000) + 5;

  for (const envId of envIds) {
    const device = devices.find((d) => d.id === envId);
    const apiUrl = device && isAsiaDevice(device) ? COMMENT_ASIA_URL : COMMENT_URL;

    const body = {
      name: 'TikTok批量评论',
      scheduleAt,
      id: envId,
      useAi: 2,
      comment,
    };
    if (links.length > 0) body.links = links;

    const res = await geelarkRequest(apiUrl, body);
    if (res?.data?.taskId) taskIds.push(res.data.taskId);
  }

  return taskIds;
}

async function runLike(cfg, envIds) {
  const devices = cfg.devices || [];
  const taskIds = [];
  const scheduleAt = Math.floor(Date.now() / 1000) + 5;

  for (const envId of envIds) {
    const device = devices.find((d) => d.id === envId);
    const apiUrl = device && isAsiaDevice(device) ? LIKE_ASIA_URL : LIKE_URL;

    const body = {
      name: 'TikTok随机点赞',
      scheduleAt,
      id: envId,
    };

    const res = await geelarkRequest(apiUrl, body);
    if (res?.data?.taskId) taskIds.push(res.data.taskId);
  }

  return taskIds;
}

async function main() {
  const cfg = loadGeelarkConfig();
  if (!cfg || !(cfg.apiKey || process.env.GEELARK_API_KEY)) {
    console.error('请配置 config/geelark.json 中的 apiKey');
    process.exit(1);
  }
  if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
  if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;

  const { subcmd, links, comment, env, envIds } = parseArgs();
  const envArg = envIds || env;
  const resolvedIds = resolveEnvIds(envArg, cfg);

  if (!resolvedIds.length) {
    console.error('请指定设备：--env "Test 3" 或 --env "Test 1,Test 2,Test 3" 或 --env-ids "id1,id2"');
    process.exit(1);
  }

  if (subcmd === 'comment') {
    console.log('设备:', resolvedIds.length, '台');
    console.log('链接:', links.length || '(未指定，将随机评论)');
    if (links.length) links.forEach((u) => console.log('  -', u));
    console.log('评论:', comment);
    console.log('');

    const taskIds = await runComment(cfg, resolvedIds, links, comment);
    console.log('任务已提交，共', taskIds.length, '个');
    taskIds.forEach((id, i) => console.log('  任务', i + 1, ':', id));
    console.log('\n可通过 node geelark-query-tasks.js 查看执行状态');
  } else if (subcmd === 'like') {
    console.log('设备:', resolvedIds.length, '台');
    console.log('');
    console.log('⚠️ 说明：GeeLark API 的 tiktokRandomStar 仅支持【随机点赞】，');
    console.log('   无法指定视频链接。每台设备会随机浏览并点赞若干视频。');
    console.log('');

    const taskIds = await runLike(cfg, resolvedIds);
    console.log('随机点赞任务已提交，共', taskIds.length, '个');
    taskIds.forEach((id, i) => console.log('  任务', i + 1, ':', id));
  } else {
    console.error('用法：');
    console.error('  评论：node geelark-engage.js comment --links "url1,url2" --comment "xxx" --env "Test 3"');
    console.error('  点赞：node geelark-engage.js like --env "Test 3"');
    console.error('');
    console.error('点赞说明：当前 GeeLark API 不支持指定链接点赞，仅支持随机点赞。');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
