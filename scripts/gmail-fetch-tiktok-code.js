#!/usr/bin/env node
/**
 * 从 Gmail 读取 TikTok 验证码（通过 IMAP）
 *
 * 用法：node gmail-fetch-tiktok-code.js
 *
 * 配置：在 scripts 目录创建 gmail.env 文件（不提交到 git）：
 *   GMAIL_USER=your@gmail.com
 *   GMAIL_APP_PASS=16位应用专用密码
 */

const fs = require('fs');
const path = require('path');
const Imap = require('imap');

// 加载 gmail.env（同目录）
const envPath = path.join(__dirname, 'gmail.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const user = process.env.GMAIL_USER || '';
const pass = process.env.GMAIL_APP_PASS || '';

if (!user || !pass) {
  console.error('请创建 scripts/gmail.env 文件，内容为：');
  console.error('  GMAIL_USER=你的Gmail@gmail.com');
  console.error('  GMAIL_APP_PASS=16位应用专用密码');
  process.exit(1);
}

// 企业网络/代理可能使用自签名证书导致 self-signed certificate 报错，设置 GMAIL_INSECURE=1 可跳过校验
const rejectUnauthorized = process.env.GMAIL_INSECURE !== '1';

const imap = new Imap({
  user,
  password: pass,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized },
});

function extractCode(text) {
  const m = String(text || '').match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

imap.once('ready', () => {
  const tryBox = (box, cb) => {
    imap.openBox(box, false, (err) => {
      if (err && box !== 'INBOX') {
        tryBox('INBOX', cb);
        return;
      }
      if (err) {
        console.error('打开邮箱失败:', err.message);
        imap.end();
        process.exit(1);
        return;
      }
      cb();
    });
  };
  tryBox(process.env.GMAIL_BOX || '[Gmail]/All Mail', () => {
    const doSearch = (criteria, label) => {
      imap.search(criteria, (err, results) => {
        if (err) {
          console.error('搜索失败:', err.message);
          imap.end();
          process.exit(1);
          return;
        }
        if (results && results.length > 0) {
          doFetch(results);
          return;
        }
        if (label === 'FROM') {
          doSearch([['SUBJECT', 'verification code']], 'SUBJECT');
        } else {
          console.log('未找到 TikTok 验证码邮件。可发一封新验证码到该邮箱再试。');
          imap.end();
        }
      });
    };
    const doFetch = (results) => {
      const fetch = imap.fetch(results, { bodies: 'HEADER.FIELDS (FROM SUBJECT)' });
      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          let buffer = '';
          stream.on('data', (ch) => (buffer += ch.toString()));
          stream.on('end', () => {
            const code = extractCode(buffer);
            if (code) {
              console.log('验证码:', code);
            } else {
              console.log('未解析到6位验证码，原始内容:', buffer.slice(0, 200));
            }
          });
        });
      });
      fetch.once('error', (e) => {
        console.error('读取失败:', e.message);
        imap.end();
        process.exit(1);
      });
      fetch.once('end', () => {
        imap.end();
      });
    };
    doSearch([['FROM', 'TikTok']], 'FROM');
  });
});

imap.once('error', (err) => {
  console.error('IMAP 错误:', err.message);
  if (err.message.includes('Invalid credentials') || err.message.includes('authentication')) {
    console.error('\n请检查：1) 应用专用密码是否正确 2) 是否已开启两步验证');
  }
  process.exit(1);
});

imap.connect();
