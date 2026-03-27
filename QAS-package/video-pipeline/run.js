#!/usr/bin/env node
/**
 * Seedance/剪映 自动化视频生成
 * 
 * 用法：node run.js --prompt "你的prompt" [--materials "path1,path2"] [--output "输出目录"]
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { createInterface } from 'readline';

const rawArgs = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i].startsWith('--')) {
    const key = rawArgs[i].slice(2);
    args[key] = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[i + 1] : true;
  }
}

let config = {};
try {
  config = JSON.parse(readFileSync('./config.json', 'utf-8'));
} catch (_) {}

let PROMPT = args.prompt || process.env.PROMPT || '';
if (args['prompt-file']) {
  PROMPT = readFileSync(args['prompt-file'], 'utf-8').trim();
}
const DURATION = args.duration || process.env.DURATION || '';  // 如 5, 10
const ASPECT_RATIO = args.aspect || process.env.ASPECT_RATIO || '16:9';  // 16:9, 9:16, 1:1
let materialsList = (args.materials || process.env.MATERIALS || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);
if (args['materials-file']) {
  const matPath = args['materials-file'];
  const fullPath = matPath.includes(':') || matPath.startsWith('\\') ? matPath : join(process.cwd(), matPath);
  materialsList = readFileSync(fullPath, 'utf-8')
    .split(/[\r\n,]+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => (p.includes(':') || p.startsWith('\\')) ? p : join(process.cwd(), p));
}
let MATERIALS = materialsList;
const OUTPUT_DIR = args.output || process.env.OUTPUT || config.outputFolder || 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos';
const URL = config.seedanceUrl || 'https://jimeng.jianying.com/ai-tool/generate';
const TIMEOUT = config.timeoutMs || 7200000; // 默认 2 小时（平台排队约 2h）
const POLL = config.pollIntervalMs || 5000;

if (!PROMPT) {
  console.error('请提供 --prompt 参数');
  process.exit(1);
}

// 确保输出目录存在
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  // UNC 路径预复制到本地，避免中文文件名编码问题
  if (MATERIALS.length > 0 && MATERIALS[0].startsWith('\\\\')) {
    const tempDir = join(process.cwd(), '.materials-temp');
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
    const localPaths = [];
    for (let i = 0; i < MATERIALS.length; i++) {
      const ext = (MATERIALS[i].match(/\.[^.]+$/) || ['.png'])[0];
      const localPath = join(tempDir, `${i + 1}${ext}`);
      try {
        copyFileSync(MATERIALS[i], localPath);
        localPaths.push(localPath);
      } catch (e) {
        console.warn(`复制失败 [${i + 1}]:`, e.message, '\n  源路径:', MATERIALS[i]);
        localPaths.push(MATERIALS[i]);
      }
    }
    if (localPaths.every(p => !p.startsWith('\\\\'))) {
      console.log('[0/5] 已将网络素材复制到本地 .materials-temp/');
    }
    MATERIALS = localPaths;
  }
  console.log('[1/5] 连接浏览器...');
  const { homedir } = await import('os');
  const userDataDir = config.userDataDir || join(homedir(), '.video-pipeline-browser');
  if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true });
  const authPath = join(userDataDir, 'jimeng-auth.json');

  const cdpPort = args['cdp-port'] || args['cdp'] || config.cdpPort || process.env.CDP_PORT || 0;
  const useExistingBrowser = !!cdpPort || !!args['use-existing-browser'];

  let browser, context, page;
  if (useExistingBrowser) {
    const port = typeof cdpPort === 'number' ? cdpPort : parseInt(String(cdpPort), 10) || 9222;
    const cdpUrl = `http://127.0.0.1:${port}`;
    console.log(`  连接到已打开的浏览器 (CDP ${port})...`);
    try {
      browser = await chromium.connectOverCDP(cdpUrl);
      const contexts = browser.contexts();
      context = contexts.length > 0 ? contexts[0] : await browser.newContext();
      page = await context.newPage();  // 新建标签页，沿用已登录的 cookies
      console.log('  已连接，将使用当前登录状态');
    } catch (e) {
      console.error('  连接失败:', e.message);
      console.log('  请先用以下命令启动 Chrome：');
      console.log('    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222');
      console.log('  或运行 launch-chrome-for-pipeline.bat 启动带调试的 Chrome');
      process.exit(1);
    }
  } else {
    const useHeadless = !!args.headless || process.env.HEADLESS === '1';
    const launchArgs = useHeadless ? ['--disable-blink-features=AutomationControlled'] : ['--start-maximized', '--disable-blink-features=AutomationControlled'];
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: useHeadless,
      args: launchArgs,
      viewport: useHeadless ? { width: 1920, height: 1080 } : null,
      ignoreHTTPSErrors: true,
      locale: 'zh-CN'
    });
    browser = null;
    page = context.pages()[0] || await context.newPage();
    console.log('  使用持久化配置，登录状态保存在', userDataDir);
  }

  try {
    console.log('[2/5] 打开即梦 AI 页面...');
    try {
      await page.goto(URL, { waitUntil: 'load', timeout: 45000 });
    } catch (e) {
      if (e.message && (e.message.includes('ERR_ABORTED') || e.message.includes('frame was detached'))) {
        console.log('  检测到重定向（可能需登录）。请在浏览器中完成登录，30 秒后自动继续...');
        await page.waitForTimeout(30000);
        console.log('  重新打开目标页面...');
        await page.goto(URL, { waitUntil: 'load', timeout: 45000 });
      } else throw e;
    }

    // 等待页面主要区域加载
    await page.waitForTimeout(2000);

    // Step 0: 检测登录页，若需登录则等待用户完成后再继续（SKILL 原始逻辑）
    const skipLogin = !!args['skip-login'] || process.env.SKIP_LOGIN === '1';
    const isLoginPage = async () => {
      const url = page.url();
      if (/passport|login|connect|sso|auth|\.com\/$/.test(url)) return true;
      const hasLogin = (await page.locator('text=扫码登录').count()) > 0 || (await page.locator('text=账号登录').count()) > 0 ||
        (await page.locator('text=登录即梦').count()) > 0 || (await page.locator('text=请输入验证码').count()) > 0;
      const hasMain = (await page.locator('text=视频生成').count()) > 0 || (await page.locator('text=Agent 模式').count()) > 0 ||
        (await page.locator('text=创作类型').count()) > 0;
      return hasLogin && !hasMain;
    };
    let onLogin = await isLoginPage();
    if (onLogin && !skipLogin) {
      console.log('  检测到登录页。请在此窗口完成登录，登录成功后脚本将自动继续（最长等待 2 分钟）...');
      const loginWait = 120000;
      const step = 3000;
      for (let t = 0; t < loginWait; t += step) {
        await page.waitForTimeout(step);
        onLogin = await isLoginPage();
        if (!onLogin) {
          console.log('  已进入生成页，继续执行...');
          if (!page.url().includes('generate')) {
            await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
          }
          await page.waitForTimeout(2000);
          break;
        }
        if (t > 0 && t % 15000 === 0) console.log('  仍在等待登录...');
      }
      if (onLogin) {
        console.log('  超时。若已登录，按 Enter 继续；否则请先完成登录后再按 Enter。');
        await new Promise(r => createInterface(process.stdin).on('line', r));
      }
    }

    // Step 0.3: 若当前在首页（/home）而非视频生成页，跳转到视频生成页
    const curUrl = page.url();
    if (curUrl.includes('/home') && !curUrl.includes('generate')) {
      if (!skipLogin) {
        console.log('  当前在首页。请完成登录（若需要），确认后按 Enter，脚本将跳转到视频生成页。');
        await new Promise(r => createInterface(process.stdin).on('line', r));
      }
      await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);
      try {
        await context.storageState({ path: authPath });
      } catch (_) {}
    }
    // 确保在生成页
    if (!page.url().includes('generate')) {
      console.log('  正在导航到视频生成页...');
      await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    // Step 0.5: 【必须优先】Agent 模式 → 视频模式，否则下方的首尾帧/全能参考、时长等选项不可见
    console.log('[2.5/5] 切换模式：Agent 模式 → 视频模式...');
    try {
      const agentTrigger = page.locator('text=Agent 模式').first();
      if (await agentTrigger.count() > 0 && await agentTrigger.isVisible()) {
        await agentTrigger.click();
        await page.waitForTimeout(1000);
        // 优先选「视频模式」，其次「视频生成」
        for (const label of ['视频模式', '视频生成']) {
          const opt = page.locator(`[role="option"]:has-text("${label}"), .lv-select-option:has-text("${label}"), .option-label:has-text("${label}")`).first();
          if (await opt.count() > 0 && await opt.isVisible()) {
            await opt.click();
            console.log(`  已切换到${label}`);
            await page.waitForTimeout(2000);
            break;
          }
        }
      } else {
        const fallback = page.locator('text=创作类型').first();
        if (await fallback.count() > 0 && await fallback.isVisible()) {
          await fallback.click();
          await page.waitForTimeout(1000);
          for (const label of ['视频模式', '视频生成']) {
            const opt = page.locator(`[role="option"]:has-text("${label}"), .lv-select-option:has-text("${label}")`).first();
            if (await opt.count() > 0 && await opt.isVisible()) {
              await opt.click();
              console.log(`  已切换到${label}`);
              await page.waitForTimeout(2000);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.log('  模式切换出错:', e?.message || '');
    }

    // 保存登录状态供下次使用（避免重复登录）
    try {
      await context.storageState({ path: authPath });
      console.log('  已保存登录状态，下次启动将自动加载');
    } catch (_) {}

    // ========== 所有选项均在 toolbar-settings 内，顺序：首尾帧→全能参考 → 16:9 → 5s→10s → 完成后再上传、填prompt ==========
    // DOM: div.toolbar-settings-YNMCja > div.toolbar-settings-content > [combobox视频生成][combobox模型][div.feature-select>combobox首尾帧][button16:9][combobox5s]

    const toolbar = page.locator('div[class*="toolbar-settings"]').first();
    const inToolbar = (await toolbar.count() > 0 && await toolbar.isVisible()) ? toolbar : page;

    // Step 0: 首尾帧 → 全能参考（有素材时必选，在 feature-select-VcsuXi 内）
    if (MATERIALS.length > 0) {
      console.log('[2.8/5] 选择「全能参考」（首尾帧 combobox）...');
      let omniRefSet = false;
      const featureCombo = inToolbar.locator('div[class*="feature-select"] [role="combobox"]').first();
      if (await featureCombo.count() > 0 && await featureCombo.isVisible()) {
        try {
          await featureCombo.click();
          await page.waitForTimeout(1200);
          const omniOpt = page.locator('#lv-select-popup-5 [role="option"]:has-text("全能参考"), #lv-select-popup-5 .option-label:has-text("全能参考"), [role="option"]:has-text("全能参考"), .lv-select-option:has-text("全能参考")').first();
          if (await omniOpt.count() > 0 && await omniOpt.isVisible()) {
            await omniOpt.click();
            omniRefSet = true;
            console.log('  已选择全能参考');
          } else {
            await page.keyboard.press('Escape');
          }
          await page.waitForTimeout(1000);
        } catch (e) {
          console.log('  选择全能参考出错:', e?.message || '');
        }
      }
      if (!omniRefSet) console.log('  未找到全能参考，请手动将首尾帧改为全能参考');
    }

    // Step 1: 比例 16:9（toolbar 内 button 含 .button-text-gwJnq9）
    console.log('[3/5] 设置选项（比例/时长）...');
    try {
      if (ASPECT_RATIO) {
        const targetRatio = String(ASPECT_RATIO).trim().replace(/\s/g, '') || '16:9';
        const ratioBtn = inToolbar.locator(`button:has(span:has-text("${targetRatio}")), button:has(.button-text-gwJnq9:has-text("${targetRatio}"))`).first();
        if (await ratioBtn.count() > 0 && await ratioBtn.isVisible()) {
          try {
            await ratioBtn.click();
            console.log('  已选比例:', targetRatio);
          } catch (_) {}
        }
        await page.waitForTimeout(500);
      }

      // Step 2: 时长 5s→10s（toolbar 内最后一个 combobox 或带 .lv-select-view-value 含 5s 的）
      if (DURATION) {
        const durNum = parseInt(String(DURATION).replace(/[^\d]/g, '') || '5', 10);
        const durVal = durNum + 's';
        let durSet = false;
        const durCombo = inToolbar.locator('[role="combobox"]:has(.lv-select-view-value:has-text("5s")), [role="combobox"]:has(.lv-select-view-value:has-text("10s")), [role="combobox"]:has(.lv-select-view-value:has-text("15s"))').last();
        if (await durCombo.count() > 0 && await durCombo.isVisible()) {
          try {
            await durCombo.click();
            await page.waitForTimeout(1500);
            const opt = page.locator('#lv-select-popup-6 [role="option"]:has-text("' + durVal + '"), [role="option"]:has-text("' + durVal + '"), .lv-select-option:has-text("' + durVal + '")').first();
            if (await opt.count() > 0 && await opt.isVisible()) {
              await opt.click();
              durSet = true;
              console.log('  已选时长:', durVal);
            }
          } catch (_) {}
        }
        if (!durSet) console.log('  未成功设置时长，请手动改为', durVal);
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log('  设置选项出错:', e?.message || '');
    }

    // Step 2: 上传素材（若有）—— 全能参考模式下需上传全部图片，支持多图
    const maxMats = parseInt(args['materials-max'] || process.env.MATERIALS_MAX || '0', 10) || MATERIALS.length;
    const toUpload = MATERIALS.slice(0, maxMats);
    if (toUpload.length > 0) {
      console.log(`[4/5] 上传参考素材 (${toUpload.length}张)...`);
      let totalUploaded = 0;
      // 先尝试一次性上传多张到同一 input（全能参考多图槽位通常支持）
      const fileInputs = await page.locator('input[type="file"]').all();
      let batchOk = false;
      for (const inp of fileInputs) {
        try {
          const accept = await inp.getAttribute('accept') || '';
          const isImage = /image|video|\.(png|jpg|jpeg|webp|gif|mp4|mov)/i.test(accept) || accept === '' || accept === '*';
          if (!isImage) continue;
          if (toUpload.length >= 1) {
            await inp.setInputFiles(toUpload.length > 1 ? toUpload : [toUpload[0]]);
            batchOk = true;
            totalUploaded = toUpload.length;
            console.log(`  已上传 ${totalUploaded} 张`);
            break;
          }
        } catch (_) {}
      }
      // 若一次性失败，则逐张上传：每张前点击「添加」以展开新槽位
      if (!batchOk) {
        for (let i = 0; i < toUpload.length; i++) {
          if (i > 0) {
            const addMoreSelectors = [
              'text=继续添加', 'text=添加更多', 'text=添加参考', 'text=添加参考内容',
              '[class*="add"]:not([class*="Agent"])', '[class*="Add"]',
              'div[role="button"]:has-text("+")', 'button:has(svg)',
              '[aria-label*="添加"]', '[aria-label*="上传"]'
            ];
            let added = false;
            for (const sel of addMoreSelectors) {
              const btn = page.locator(sel).first();
              if (await btn.count() > 0 && await btn.isVisible()) {
                try {
                  await btn.click();
                  await page.waitForTimeout(2000);
                  added = true;
                  break;
                } catch (_) {}
              }
            }
            if (!added) {
              console.log(`  未找到添加按钮，已上传 ${i} 张，将继续尝试对现有 input 上传剩余...`);
            }
          }
          let uploaded = false;
          const inputs = await page.locator('input[type="file"]').all();
          // 优先使用第 i 个 input（对应第 i 个上传槽位），避免重复写到同一 input
          if (inputs.length > i) {
            try {
              const inp = inputs[i];
              const accept = await inp.getAttribute('accept') || '';
              const isImage = /image|video|\.(png|jpg|jpeg|webp|gif|mp4|mov)/i.test(accept) || accept === '' || accept === '*';
              if (isImage) {
                await inp.evaluate(el => { el.style.visibility = 'visible'; el.style.opacity = '1'; el.style.pointerEvents = 'auto'; });
                await inp.setInputFiles(toUpload[i]);
                uploaded = true;
                totalUploaded++;
              }
            } catch (_) {}
          }
          if (!uploaded) {
            for (const inp of inputs) {
              try {
                const accept = await inp.getAttribute('accept') || '';
                const isImage = /image|video|\.(png|jpg|jpeg|webp|gif|mp4|mov)/i.test(accept) || accept === '' || accept === '*';
                if (isImage && (await inp.isVisible() || (await inp.evaluate(el => el.offsetParent != null)))) {
                  await inp.setInputFiles(toUpload[i]);
                  uploaded = true;
                  totalUploaded++;
                  break;
                }
              } catch (_) {}
            }
          }
          if (!uploaded) {
            const inp = page.locator('input[type="file"]').nth(i);
            if (await inp.count() > i) {
              try {
                await inp.evaluate(el => { el.style.visibility = 'visible'; el.style.opacity = '1'; });
                await inp.setInputFiles(toUpload[i]);
                uploaded = true;
                totalUploaded++;
              } catch (_) {}
            }
          }
          if (uploaded) {
            console.log(`  已上传 ${i + 1}/${toUpload.length}`);
            await page.waitForTimeout(2000);
          } else {
            console.log(`  第 ${i + 1} 张上传失败，请手动上传`);
          }
        }
      }
      if (totalUploaded < toUpload.length) {
        console.log(`  注意：目标 ${toUpload.length} 张，实际已上传 ${totalUploaded} 张。若不足请手动补充。`);
      }
      await page.waitForTimeout(1500);
    } else {
      console.log('[4/5] 无素材，跳过上传');
    }

    // Step 3: 输入 prompt
    console.log('[5/5] 输入 Prompt...');
    const promptSelectors = [
      'textarea[placeholder*="参考"]',
      'textarea[placeholder*="描述"]',
      'textarea[placeholder*="画面"]',
      'textarea[placeholder*="创作"]',
      '[contenteditable="true"][data-placeholder*="描述"]',
      'textarea:not([placeholder*="Agent"])',
      'textarea',
      '[contenteditable="true"]'
    ];
    let promptFilled = false;
    for (const sel of promptSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        try {
          await el.waitFor({ state: 'visible', timeout: 2000 });
          const box = await el.boundingBox();
          if (box && box.height < 60) continue;  // 跳过底部小输入框（Agent 模式）
          await el.click();
          await el.fill('');
          await el.fill(PROMPT);
          promptFilled = true;
          console.log('[4/5] 已填入 prompt');
          break;
        } catch (_) {}
      }
    }
    if (!promptFilled) {
      console.log('未找到主 prompt 输入框，请手动输入后按 Enter 继续...');
      await new Promise(r => createInterface(process.stdin).on('line', r));
    }

    // Step 4: 点击确认/生成。即梦圆形确认按钮（lv-btn-primary + submit-button-* 或 submit-button-CpjScj）
    let genClicked = false;
    await page.waitForTimeout(3500);  // 等待确认按钮从 disabled 变为可点（延长至 3.5 秒）
    // 4.x 优先尝试：焦点在输入框时按 Enter 可能触发提交（部分 UI 支持）
    if (promptFilled) {
      try {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(800);
      } catch (_) {}
    }
    // 4.0 Enter 仅作辅助，不设 genClicked，确保后续仍会尝试点击确认按钮
    try {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(800);
      console.log('[6/5] 已尝试 Enter 辅助提交');
    } catch (_) {}
    // 等待确认按钮出现（即梦按钮可能异步渲染）
    try {
      await page.waitForSelector('button[class*="submit-button"]', { state: 'visible', timeout: 10000 });
    } catch (_) {}
    // 即梦确认按钮：button.lv-btn.lv-btn-primary.lv-btn-shape-circle.lv-btn-icon-only[class*="submit-button"]
    const submitSelectors = [
      'button.lv-btn-primary.lv-btn-shape-circle.lv-btn-icon-only[class*="submit-button"]',
      'button.lv-btn-primary.lv-btn-icon-only[class*="submit-button"]',
      'button[class*="submit-button-CpjScj"]',
      'button[class*="submit-button-KJTUYS"]',
      'button[class*="submit-button-"]',
      'div:has(textarea) button[class*="submit-button"]',
      'div:has([contenteditable="true"]) button[class*="submit-button"]'
    ];
    const tryClick = async (btn) => {
      await btn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);  // 滚动后短暂等待
      try {
        await btn.click({ timeout: 5000 });
        return true;
      } catch (_) {}
      try {
        await btn.click({ force: true, timeout: 5000 });
        return true;
      } catch (_) {}
      try {
        await btn.evaluate((el) => el.click());
        return true;
      } catch (_) {}
      // 4) 坐标点击：获取按钮中心，用 mouse.click 模拟真实点击
      try {
        const box = await btn.boundingBox();
        if (box) {
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 2;
          await page.mouse.click(x, y, { delay: 50 });
          return true;
        }
      } catch (_) {}
      return false;
    };
    for (const sel of submitSelectors) {
      const btns = page.locator(sel);
      const cnt = await btns.count();
      for (let i = 0; i < cnt && !genClicked; i++) {
        const submitBtn = btns.nth(i);
        try {
          if (!(await submitBtn.isVisible())) continue;
          for (let wait = 0; wait < 8; wait++) {
            const isDisabled = await submitBtn.getAttribute('disabled');
            const ariaDisabled = await submitBtn.getAttribute('aria-disabled');
            if (!isDisabled && ariaDisabled !== 'true') break;
            await page.waitForTimeout(1000);
          }
          if (await tryClick(submitBtn)) {
            genClicked = true;
            console.log('[6/5] 已点击确认按钮（submit-button）');
            break;
          }
        } catch (e) {
          console.log(`[6/5] 选择器 ${sel} 第${i + 1}个 失败: ${e?.message || e}`);
        }
      }
      if (genClicked) break;
    }
    // 4.2 备选：确认按钮可能在 iframe 内（即梦部分 UI 使用 iframe）
    if (!genClicked) {
      const frames = page.frames();
      for (const frame of frames) {
        if (frame === page.mainFrame()) continue;
        try {
          for (const sel of submitSelectors) {
            const btns = frame.locator(sel);
            const cnt = await btns.count();
            for (let i = 0; i < cnt && !genClicked; i++) {
              const submitBtn = btns.nth(i);
              if (!(await submitBtn.isVisible())) continue;
              for (let wait = 0; wait < 5; wait++) {
                const isDisabled = await submitBtn.getAttribute('disabled');
                const ariaDisabled = await submitBtn.getAttribute('aria-disabled');
                if (!isDisabled && ariaDisabled !== 'true') break;
                await page.waitForTimeout(500);
              }
              if (await tryClick(submitBtn)) {
                genClicked = true;
                console.log('[6/5] 已点击确认按钮（iframe 内）');
                break;
              }
            }
            if (genClicked) break;
          }
        } catch (_) {}
        if (genClicked) break;
      }
    }
    // 4.1 备选：带「开始生成」「立即生成」文字的按钮
    for (const txt of ['开始生成', '立即生成']) {
      const btn = page.locator(`button:has-text("${txt}"), [role="button"]:has-text("${txt}")`).first();
      if (await btn.count() > 0 && await btn.isVisible()) {
        try {
          await btn.click();
          genClicked = true;
          console.log(`[6/5] 已点击「${txt}」`);
          break;
        } catch (_) {}
      }
      if (genClicked) break;
    }
    // 4.1 备选：在 content 区查找（content-oZ2zsI / content-*），生成按钮通常在 textarea 旁的圆形向上箭头
    const contentArea = page.locator('[class*="content-"]').first();
    if (await contentArea.count() > 0 && await contentArea.isVisible()) {
      const contentBtns = contentArea.locator('button, [role="button"], div[class*="btn"]');
      const n = await contentBtns.count();
      for (let i = n - 1; i >= 0; i--) {
        const btn = contentBtns.nth(i);
        try {
          if (!(await btn.isVisible())) continue;
          const text = (await btn.textContent() || '').trim();
          if (text.includes('再次') || /^[+\-?]$/.test(text) || text.includes('5s') || text.includes('10s') || text.includes('16:9')) continue;
          const hasSvg = (await btn.locator('svg').count()) > 0;
          const rect = await btn.boundingBox();
          if (rect && rect.width >= 28 && hasSvg) {
            await btn.click();
            genClicked = true;
            console.log('[6/5] 已点击生成按钮（content 区）');
            break;
          }
        } catch (_) {}
      }
    }
    if (!genClicked) {
      try {
        const promptContainer = page.locator('div:has(textarea), div:has([contenteditable="true"])').first();
        if (await promptContainer.count() > 0) {
          const buttons = promptContainer.locator('button, [role="button"]');
          const count = await buttons.count();
          for (let i = count - 1; i >= 0; i--) {
            const btn = buttons.nth(i);
            if (!(await btn.isVisible())) continue;
            const text = (await btn.textContent() || '').trim();
            if (text.includes('再次') || /^[+\-?]$/.test(text)) continue;
            const hasSvg = (await btn.locator('svg').count()) > 0;
            if (hasSvg || text.length < 3) {
              await btn.click();
              genClicked = true;
              console.log('[6/5] 已点击生成按钮（输入框旁）');
              break;
            }
          }
        }
      } catch (_) {}
    }
    const genSelectors = [
      'textarea ~ button',
      'textarea ~ div button',
      '[aria-label*="发送"]',
      '[aria-label*="提交"]',
      '[aria-label*="生成"]',
      'button:has-text("开始生成")',
      'button:has-text("立即生成")',
      'button:has-text("生成")',
      '[role="button"]:has-text("生成")',
      'button:has-text("Generate")',
      'button[type="submit"]',
      '[class*="submit"]',
      '[class*="send"]'
    ];
    if (!genClicked) {
      for (const sel of genSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.count() > 0) {
          try {
            const text = (await btn.textContent() || '').trim();
            if (text.includes('再次')) continue;
            if (await btn.isVisible()) {
              await btn.click();
              genClicked = true;
              console.log('[5/5] 已点击生成按钮');
              break;
            }
          } catch (_) {}
        }
      }
    }
    if (!genClicked) {
      const allGen = page.locator('button, [role="button"]').filter({ hasText: /生成/ });
      for (let i = 0; i < Math.min(await allGen.count(), 10); i++) {
        const btn = allGen.nth(i);
        const text = (await btn.textContent() || '').trim();
        if (text.includes('再次')) continue;
        if (await btn.isVisible()) {
          await btn.click();
          genClicked = true;
          console.log('[5/5] 已点击生成按钮（备用选择器）');
          break;
        }
      }
    }
    if (!genClicked) {
      const debugDir = join(OUTPUT_DIR, '..');
      try {
        await page.screenshot({ path: join(debugDir, 'video-pipeline-debug.png') });
        console.log('已保存截图到 video-pipeline-debug.png，便于排查按钮位置');
      } catch (_) {}
      console.log('未找到主生成按钮，请手动点击页面上的「生成」按钮。');
      console.log('点击完成后按 Enter 继续...');
      await new Promise(r => createInterface(process.stdin).on('line', r));
      genClicked = true;  // 用户已手动点击，继续轮询
    }
    console.log('[5/5] 等待视频生成完成（平台排队约 2 小时，请保持浏览器打开）...');

    // Step 4: 等待生成完成（轮询，仅当已点击生成后才检测「再次生成」）
    const startTime = Date.now();
    let finished = false;
    while (Date.now() - startTime < TIMEOUT) {
      await page.waitForTimeout(POLL);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed > 0 && elapsed % 60 === 0) {
        const inQueue = (await page.locator('text=排队中').count()) > 0;
        console.log(`  已等待 ${Math.floor(elapsed / 60)} 分钟${inQueue ? '，排队中' : ''}...`);
      }

      // 检测完成：再次生成按钮出现 = 已生成（需等待至少 60 秒，避免误判页面残留）
      const regenBtn = page.locator('text=再次生成').first();
      if (elapsed >= 60 && await regenBtn.count() > 0 && await regenBtn.isVisible()) {
        finished = true;
        // 尝试从 video 元素获取 blob 并保存
        const video = page.locator('video').first();
        const src = await video.count() > 0 ? await video.getAttribute('src') : null;
        if (src?.startsWith('blob:')) {
          const buffer = await page.evaluate(async (url) => {
            const r = await fetch(url);
            return Array.from(new Uint8Array(await r.arrayBuffer()));
          }, src);
          const outPath = join(OUTPUT_DIR, `生成_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.mp4`);
          writeFileSync(outPath, Buffer.from(buffer));
          writeFileSync(join(OUTPUT_DIR, 'latest.json'), JSON.stringify({ outputPath: outPath, prompt: PROMPT, timestamp: new Date().toISOString() }, null, 2), 'utf-8');
          console.log('成片已保存:', outPath);
        } else {
          console.log('检测到「再次生成」按钮，视频已生成。请手动下载或使用页面下载功能。');
          console.log('成片预览在页面中，可右键视频另存为，或点击详情中的下载。');
        }
        break;
      }
      const video = page.locator('video').first();
      const downloadBtn = page.locator('text=下载, a[download], button:has-text("下载")').first();

      if (await video.count() > 0 && (await video.getAttribute('src'))?.startsWith('blob:')) {
        finished = true;
        const src = await video.getAttribute('src');
        console.log('检测到生成视频');
        // 通过 evaluate 获取 blob URL 并下载
        const buffer = await page.evaluate(async (url) => {
          const r = await fetch(url);
          return Array.from(new Uint8Array(await r.arrayBuffer()));
        }, src);
        const outPath = join(OUTPUT_DIR, `生成_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.mp4`);
        writeFileSync(outPath, Buffer.from(buffer));
        writeFileSync(join(OUTPUT_DIR, 'latest.json'), JSON.stringify({ outputPath: outPath, prompt: PROMPT, timestamp: new Date().toISOString() }, null, 2), 'utf-8');
        console.log('成片已保存:', outPath);
        break;
      }
      if (await downloadBtn.count() > 0) {
        finished = true;
        const href = await downloadBtn.getAttribute('href');
        if (href) {
          const resp = await page.request.get(href);
          const outPath = join(OUTPUT_DIR, `生成_${Date.now()}.mp4`);
          const body = await resp.body();
          writeFileSync(outPath, Buffer.from(body));
          writeFileSync(join(OUTPUT_DIR, 'latest.json'), JSON.stringify({ outputPath: outPath, prompt: PROMPT, timestamp: new Date().toISOString() }, null, 2), 'utf-8');
          console.log('成片已保存:', outPath);
        }
        break;
      }
    }

    if (!finished) {
      console.log('超时或未检测到完成。请手动检查页面，视频可能在预览区。');
    }
    console.log('按 Enter 关闭浏览器...');
    await new Promise(r => createInterface(process.stdin).on('line', r));
  } catch (err) {
    console.error('执行出错:', err.message);
    console.log('按 Enter 关闭浏览器...');
    await new Promise(r => createInterface(process.stdin).on('line', r));
  } finally {
    if (useExistingBrowser && browser) {
      await browser.close();  // CDP：仅断开连接，不关闭用户浏览器
    } else {
      await context.close();  // 持久化模式：关闭即退出
    }
  }
})();
