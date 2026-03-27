#!/usr/bin/env node
/**
 * TikTok 批量注册脚本（Playwright）
 *
 * 用法：node batch-register-tiktok.js [--once]
 *
 * 选项：
 *   --once    每次只注册 1 个账号后退出（可隔几小时手动再运行）
 *
 * 环境变量：
 *   DELAY_HOURS=3  每个账号之间等待的小时数（默认 3，设为 0 则不等待）
 *
 * 依赖：playwright、gmail.env、tiktok-accounts.json
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { fetchTikTokCode } = require('./gmail-fetch-code.js');

const SIGNUP_URL = 'https://www.tiktok.com/signup/phone-or-email/email';
const ACCOUNTS_PATH = path.join(__dirname, 'tiktok-accounts.json');

const PROXY_HOST = '10.21.100.220';
// 国家/地区 -> 代理端口
const COUNTRY_PROXY_PORT = {
  美国: 8800, 德国: 8820, 越南: 8830, 印尼: 8840, ID: 8840, 印度尼西亚: 8840,
  '中国台湾': 8850, 台湾: 8850, 韩国: 8860, 巴西: 8870, 墨西哥: 8880, 俄罗斯: 8890,
  印度: 8900, 阿根廷: 8910, 泰国: 8920, 南非: 8930, 巴林: 8940, 日本: 8950,
  菲律宾: 8960, 孟加拉: 8970,
};

function getProxyForCountry(country) {
  const port = COUNTRY_PROXY_PORT[country] ?? COUNTRY_PROXY_PORT['印尼'];
  return `http://${PROXY_HOST}:${port}`;
}

// 每个账号之间等待的小时数（防 TikTok 限流），可通过 DELAY_HOURS 覆盖
const DELAY_HOURS = parseInt(process.env.DELAY_HOURS || '3', 10) || 0;

// 随机生日（18-20 岁）
function randomBirth1820() {
  const year = 2005 + Math.floor(Math.random() * 4); // 2005-2008
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return { month, day, year };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForManualCaptcha(page) {
  console.log('\n[!] 检测到可能需要人工验证（CAPTCHA），请在浏览器中手动完成，完成后按回车继续...');
  await new Promise((r) => process.stdin.once('data', r));
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function fillBirthday(page) {
  const birth = randomBirth1820();
  const monthSelect = page.locator('select').first();
  const selectCount = await page.locator('select').count();
  if (selectCount >= 3) {
    await monthSelect.selectOption({ value: String(birth.month) });
    await page.locator('select').nth(1).selectOption({ value: String(birth.day) });
    await page.locator('select').nth(2).selectOption({ value: String(birth.year) });
    return;
  }
  // 自定义下拉：只找 combobox 触发按钮（排除 listbox 选项容器）
  const t = await page.locator('[role="combobox"]').all();
  if (t.length >= 3) {
    await t[0].click();
    await sleep(300);
    await page.getByText(MONTH_NAMES[birth.month], { exact: true }).first().click();
    await sleep(200);
    await t[1].click();
    await sleep(300);
    await page.getByText(String(birth.day), { exact: true }).first().click();
    await sleep(200);
    await t[2].click();
    await sleep(300);
    await page.getByText(String(birth.year), { exact: true }).first().click();
    return;
  }
  // 按 placeholder 找下拉触发区域（自定义下拉常用）
  const monthBox = page.getByPlaceholder('Month');
  if (await monthBox.count() > 0) {
    await monthBox.first().click();
    await sleep(500);
    await page.getByText(MONTH_NAMES[birth.month], { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(300);
    await page.getByPlaceholder('Day').first().click();
    await sleep(500);
    await page.getByText(String(birth.day), { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(300);
    await page.getByPlaceholder('Year').first().click();
    await sleep(500);
    await page.getByText(String(birth.year), { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  }
}

async function registerOne(page, account, options = {}) {
  const { headless = false, slowMo = 300 } = options;
  const { email, password, username } = account;

  try {
    await page.goto(SIGNUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    // Step 1: 生日
    await fillBirthday(page);
    await sleep(500);

    // Step 2: 邮箱
    const emailInput = page.getByPlaceholder('Email address').or(page.locator('input[type="email"]')).or(page.locator('input[placeholder*="email" i]')).first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);
    await sleep(400);

    // Step 3: 密码（若在同一页）
    const pwdInput = page.locator('input[type="password"]').first();
    if (await pwdInput.isVisible()) {
      await pwdInput.fill(password);
      await sleep(400);
    }

    // 勾选营销邮件
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) await checkbox.check().catch(() => {});

    // 点击 Send code 发送验证码
    await page.getByRole('button', { name: /send code/i }).first().click({ timeout: 5000 }).catch(() =>
      page.getByRole('button', { name: /next/i }).first().click()
    );
    await sleep(3000);

    // 若出现 CAPTCHA iframe，等待用户手动完成
    try {
      const cap = page.locator('iframe[src*="captcha"], iframe[title*="recaptcha"]').first();
      if (await cap.count() > 0 && await cap.isVisible()) {
        await waitForManualCaptcha(page);
      }
    } catch (_) {}

    // Step 3: 验证码（多等 10 秒再用最新码，避免取到上一封旧码）
    console.log(`  [${email}] 等待 Gmail 验证码（最多约 1 分钟）...`);
    let code = null;
    for (let i = 0; i < 12; i++) {
      await sleep(i === 0 ? 18000 : 5000); // 首次 18 秒，确保新邮件到达后再取
      code = await fetchTikTokCode();
      if (code) break;
      console.log(`  [${email}] 第 ${i + 1} 次未获取到验证码，继续等待...`);
    }
    if (!code) {
      throw new Error('未能在 Gmail 中获取到验证码');
    }
    console.log(`  [${email}] 验证码: ${code}`);

    const codeInput = page.getByPlaceholder(/6-digit|verification|code/i).or(page.locator('input[inputmode="numeric"]')).or(page.locator('input[placeholder*="code" i]')).first();
    await codeInput.waitFor({ state: 'visible', timeout: 15000 });
    await codeInput.fill(code);
    await sleep(5000); // 等待 TikTok 校验验证码（延长到 5 秒）

    // 点击已启用的 Next 按钮（验证码后，进入下一界面）
    const nextBtn = page.locator('button:not([disabled])').filter({ hasText: /next|submit|verify|continue/i });
    await nextBtn.first().waitFor({ state: 'visible', timeout: 25000 });
    await nextBtn.first().click();
    await sleep(3000);

    // Step 3.5: 用户昵称（仅在验证码成功后、进入「设置用户名」界面时填写，绝不填到 Email 框）
    // 条件：验证码输入框已消失（已跳转）+ 存在明确为用户名的输入（placeholder 含 create/choose 等，且不含 email）
    if (username) {
      const codeInputGone = await page.getByPlaceholder(/6-digit|verification|code/i).first().isVisible().then((v) => !v).catch(() => true);
      if (codeInputGone) {
        const usernameInput = page
          .getByPlaceholder(/create.*username|choose.*username|pick.*username|enter.*username|select.*username|你的用户名|设置用户名/i)
          .or(page.locator('input[placeholder*="create" i][placeholder*="username" i]'))
          .first();
        try {
          await usernameInput.waitFor({ state: 'visible', timeout: 6000 });
          await usernameInput.fill(username);
          await sleep(800);
          const nextAfterUser = page.locator('button:not([disabled])').filter({ hasText: /next|done|continue|sign up|create|继续|下一步/i });
          await nextAfterUser.first().waitFor({ state: 'visible', timeout: 5000 });
          await nextAfterUser.first().click();
          await sleep(2000);
        } catch (_) {}
      }
    }

    // Step 4: 密码（若在后续步骤出现）
    const pwdInputLater = page.locator('input[type="password"]').first();
    if (await pwdInputLater.isVisible()) {
      await pwdInputLater.fill(password);
      await sleep(500);
    }
    // 等待 Sign up 按钮启用后点击（多种可能的按钮文案）
    const submitBtn = page.locator('button:not([disabled])').filter({ hasText: /next|sign up|create|done|continue|完成|下一步/i });
    await submitBtn.first().waitFor({ state: 'visible', timeout: 25000 });
    await submitBtn.first().click();
    await sleep(3000);

    // 检查是否成功（URL 变化或出现首页元素）
    const url = page.url();
    if (!url.includes('/signup') || (await page.locator('[data-e2e="recommend-list"]').count()) > 0) {
      return { ok: true, email };
    }
    return { ok: false, email, reason: '可能未完成注册，请检查页面' };
  } catch (e) {
    return { ok: false, email, reason: e.message };
  }
}

async function main() {
  const runOnce = process.argv.includes('--once');
  const emailIdx = process.argv.indexOf('--email');
  const targetEmail = emailIdx >= 0 && process.argv[emailIdx + 1] ? process.argv[emailIdx + 1].trim() : null;

  if (!fs.existsSync(ACCOUNTS_PATH)) {
    console.error('缺少 tiktok-accounts.json');
    process.exit(1);
  }
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf-8'));
  let toRegister = accounts.filter((a) => a.status === '未注册');
  if (targetEmail) {
    toRegister = toRegister.filter((a) => a.email === targetEmail);
    if (toRegister.length === 0) {
      console.error(`未找到账号 ${targetEmail}，或该账号已注册`);
      process.exit(1);
    }
  }
  if (runOnce) toRegister = toRegister.slice(0, 1);
  if (toRegister.length === 0) {
    console.log('没有待注册账号');
    return;
  }
  console.log(`待注册: ${toRegister.length} 个${runOnce ? ' (--once 模式)' : ''}`);
  if (DELAY_HOURS > 0) console.log(`每个账号间隔: ${DELAY_HOURS} 小时`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const results = [];
  for (const acc of toRegister) {
    const proxy = getProxyForCountry(acc.country || '印尼');
    console.log(`\n--- 注册 ${acc.email} [${acc.country || '印尼'} 代理 ${proxy}] ---`);

    const context = await browser.newContext({
      proxy: { server: proxy },
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    const r = await registerOne(page, acc, { headless: false, slowMo: 300 });
    const keepOpen = process.argv.includes('--keep-open');
    if (!r.ok && keepOpen) {
      console.log('\n  [--keep-open] 浏览器保持打开，请手动完成注册后按 Enter 继续...');
      await new Promise((resolve) => process.stdin.once('data', resolve));
    }
    await context.close();

    results.push(r);
    if (r.ok) {
      const idx = accounts.findIndex((a) => a.email === r.email);
      if (idx >= 0) accounts[idx].status = '已注册';
    }
    console.log(r.ok ? `  ✓ 成功` : `  ✗ ${r.reason}`);
    fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), 'utf-8');

    const isLast = results.length >= toRegister.length;
    if (!isLast && DELAY_HOURS > 0) {
      const ms = DELAY_HOURS * 60 * 60 * 1000;
      const nextAt = new Date(Date.now() + ms);
      console.log(`\n等待 ${DELAY_HOURS} 小时后继续下一个账号，预计 ${nextAt.toLocaleString('zh-CN')} 开始...`);
      await sleep(ms);
    } else {
      await sleep(3000);
    }
  }

  await browser.close();
  console.log('\n完成:', results.filter((r) => r.ok).length, '成功,', results.filter((r) => !r.ok).length, '失败');
  if (runOnce && accounts.filter((a) => a.status === '未注册').length > 0) {
    console.log('\n提示: 可隔几小时后再次运行 node batch-register-tiktok.js --once');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
