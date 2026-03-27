/**
 * 从 Gmail 获取 TikTok 验证码（可被其他脚本 require 调用）
 * 返回 Promise<string|null>
 */
const fs = require('fs');
const path = require('path');
const Imap = require('imap');

const envPath = path.join(__dirname, 'gmail.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

function extractCode(text) {
  const m = String(text || '').match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

function fetchTikTokCode() {
  return new Promise((resolve, reject) => {
    const user = process.env.GMAIL_USER || '';
    const pass = process.env.GMAIL_APP_PASS || '';
    if (!user || !pass) {
      reject(new Error('缺少 GMAIL_USER 或 GMAIL_APP_PASS'));
      return;
    }
    const rejectUnauthorized = process.env.GMAIL_INSECURE !== '1';
    const imap = new Imap({
      user, password: pass,
      host: 'imap.gmail.com', port: 993, tls: true,
      tlsOptions: { rejectUnauthorized },
    });
    let found = null;
    imap.once('ready', () => {
      const tryBox = (box, cb) => {
        imap.openBox(box, false, (err) => {
          if (err && box !== 'INBOX') return tryBox('INBOX', cb);
          if (err) return cb(err);
          cb();
        });
      };
      tryBox(process.env.GMAIL_BOX || '[Gmail]/All Mail', (err) => {
        if (err) return imap.end(), reject(err);
        imap.search([['FROM', 'TikTok']], (e, results) => {
          if (e || !results?.length) {
            imap.search([['SUBJECT', 'verification code']], (e2, r2) => {
              if (e2 || !r2?.length) return imap.end(), resolve(null);
              doFetch(r2);
            });
            return;
          }
          doFetch(results);
        });
      });
      function doFetch(results) {
        // 只取最新 1 封，避免取到旧验证码
        const f = imap.fetch(results.slice(-1), { bodies: ['TEXT', 'HEADER.FIELDS (FROM SUBJECT)'] });
        f.on('message', (msg) => {
          msg.on('body', (stream) => {
            let buf = '';
            stream.on('data', (ch) => (buf += ch.toString()));
            stream.on('end', () => { const c = extractCode(buf); if (c) found = c; });
          });
        });
        f.once('end', () => { imap.end(); });
      }
    });
    imap.once('error', reject);
    imap.once('end', () => resolve(found));
    imap.connect();
  });
}

module.exports = { fetchTikTokCode };

if (require.main === module) {
  fetchTikTokCode().then((c) => console.log(c ? `验证码: ${c}` : '未找到')).catch((e) => console.error(e.message));
}
