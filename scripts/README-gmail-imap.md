# Gmail 应用专用密码 + IMAP 脚本

## 一、创建应用专用密码（App Password）

### 英文界面步骤

1. **直接打开**：https://myaccount.google.com/apppasswords  
   （若跳转到安全页，在左侧或下方找 **App passwords**）

2. **或手动进入**：
   - 打开 https://myaccount.google.com
   - 左侧点击 **Security**（安全）
   - 找到 **How you sign in to Google**（您如何登录 Google）
   - 点击 **2-Step Verification**（两步验证）→ 确认已开启
   - 返回 Security，找到 **App passwords**（应用专用密码）

3. **生成密码**：
   - 点击 **Select app**（选择应用）→ 选 **Mail**（邮件）
   - 点击 **Select device**（选择设备）→ 选 **Windows Computer** 或 **Other**
   - 点击 **Generate**（生成）
   - 复制显示的 **16 位密码**（如 `abcd efgh ijkl mnop`，使用时去掉空格）

**若看不到 App passwords**：需先开启两步验证（2-Step Verification）。

---

## 二、运行脚本

```powershell
cd C:\Users\wei.liu\Desktop\cursor_try\QAS\scripts
npm install
$env:GMAIL_USER = "你的Gmail@gmail.com"
$env:GMAIL_APP_PASS = "16位应用专用密码"
node gmail-fetch-tiktok-code.js
```

**输出**：会打印最新一封来自 TikTok 的未读邮件中的 6 位验证码。
