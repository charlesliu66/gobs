# 用 GitHub 部署本工具（推荐：GitHub + Vercel）

GitHub **只存代码**，真正「公网可访问」需要再连一个托管平台。**Next.js 官方推荐 Vercel**，与 GitHub 一键对接。

---

## 一、准备工作

1. 注册 [GitHub](https://github.com) 账号。
2. 注册 [Vercel](https://vercel.com) 账号（可用 GitHub 登录）。
3. **不要把 GeeLark Token 提交到公开仓库**：
   - 在 Vercel 后台配置环境变量 `GEELARK_BEARER_TOKEN`（见下文）。
   - 本地 `web/lib/geelark-token.ts` 若写了真实 Token，**不要提交**；或保持仓库里为占位符 `PASTE_YOUR_BEARER_TOKEN_HERE`。

---

## 二、把代码推到 GitHub

在项目根目录（含 `web` 文件夹的那一层）执行：

```bash
git init
git add .
git commit -m "init"
```

在 GitHub 网页 **New repository** 建一个空仓库（不要勾选自动加 README），按页面提示：

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

若仓库在 `web` 子目录里，有两种方式：

- **方式 A**：在 GitHub 建仓库时只上传 `web` 目录内容（把 `web` 当作仓库根目录），适合「整个项目就是前端」。
- **方式 B**：整个 `SJ` 仓库推上去，在 Vercel 里把 **Root Directory** 设为 `web`。

---

## 三、用 Vercel 连接 GitHub 并部署

1. 打开 [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → 选你的 GitHub 仓库。
2. **Framework Preset** 选 **Next.js**。
3. 若代码在子目录：展开 **Root Directory**，选 **`web`**。
4. **Environment Variables** 添加：
   - `GEELARK_BEARER_TOKEN` = 你的 Bearer Token（不要泄露给他人）
   - （可选）`GEELARK_BASE_URL` = `https://openapi.geelark.com/open/v1`
5. 点击 **Deploy**。约 1～2 分钟完成后会得到 **`https://xxx.vercel.app`**，这就是公网地址。

之后每次你 `git push` 到 `main`，Vercel 会自动重新部署。

---

## 四、国内访问（可选）

- Vercel 默认域名在海外，国内访问可能较慢或被限制，可：
  - 绑定自己的域名（在 Vercel 里 Add Domain，DNS 按提示解析）；
  - 或改用国内云（阿里云/腾讯云）自建 Node 部署（流程不同，需另配服务器）。

---

## 五、常见问题

| 问题 | 处理 |
|------|------|
| 部署成功但 GeeLark 报错 | 检查 Vercel 里 `GEELARK_BEARER_TOKEN` 是否填对、是否已 Redeploy |
| 只想用环境变量、不用 geelark-token.ts | 保持 `geelark-token.ts` 里为占位符，只配 Vercel 环境变量即可 |
| 仓库要私有 | GitHub 私有仓库 + Vercel 导入同样可用（按套餐可能有限制） |

---

## 六、小结

| 步骤 | 做什么 |
|------|--------|
| 1 | 代码推送到 GitHub |
| 2 | Vercel Import 该仓库，Root 选 `web`（若需要） |
| 3 | 配置 `GEELARK_BEARER_TOKEN` 等环境变量 |
| 4 | Deploy，使用分配的 `https://xxx.vercel.app` |

这样即完成「用 GitHub 管理代码 + 公网可打开」的流程。
