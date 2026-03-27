# GeeLark API 集成

按 **官方 API 说明文档（en-doc.zip）** 完成配置与请求格式，支持云手机、任务、素材等开放接口。

## 配置说明

凭证写在 **`.env`**（已加入 `.gitignore`，请勿提交）：

| 变量 | 说明 |
|------|------|
| `GEELARK_API_KEY` | API Key（Key 验证时参与签名） |
| `GEELARK_APP_ID` | 应用 ID（Key 验证时必填） |
| `GEELARK_BEARER_TOKEN` | Bearer Token（Token 验证时必填） |
| `GEELARK_BASE_URL` | 基础地址，默认 `https://openapi.geelark.com/open/v1` |

官方规定：

- 所有请求为 **POST**，请求体为 **JSON**。
- 请求头必须带 **traceId**（UUID v4，唯一请求 ID）。
- 认证二选一：**Token 验证**（Bearer + traceId）或 **Key 验证**（appId + traceId + ts + nonce + sign）。

## 使用方式

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 在代码中调用（默认 Token 验证）

```python
from geelark_client import post, check_config, PATHS

# 检查配置
ok, missing = check_config("token")
if not ok:
    print("缺少:", missing)
else:
    # 云手机列表（与文档 Request URL 一致）
    r = post(PATHS["phone_list"], data={"page": 1, "pageSize": 10})
    print(r.status_code, r.json())

    # 任务查询
    r = post(PATHS["task_query"], data={"ids": ["任务ID"]})
    print(r.json())
```

### 3. 使用 Key 验证

需在 `.env` 中配置 `GEELARK_APP_ID` 和 `GEELARK_API_KEY`，然后：

```python
from geelark_client import post, check_config, PATHS

ok, missing = check_config("key")
if not ok:
    print("缺少:", missing)
else:
    r = post(PATHS["phone_list"], data={"page": 1, "pageSize": 10}, auth="key")
    print(r.json())
```

### 4. 直接运行客户端（连通性测试）

```bash
python geelark_client.py
```

会使用 Token 验证请求 `phone/list`，并打印状态码与响应中的 `code`、`msg`、`data` 键。

---

## TikTok 评论定时发布

在**指定 TikTok 视频链接**下，用云手机**定时发布评论**：支持手动输入评论、或 AI 生成后人工确认，支持**选择时区**定时。

### 功能要点

- **指定链接**：通过 GeeLark API 的 `links` 参数指定要评论的视频链接。
- **评论来源**：  
  - **手动输入**：直接填写评论内容。  
  - **AI 生成 + 人工确认**：由脚本生成多条备选（可配置 `OPENAI_API_KEY` 用 GPT 生成，否则从预设中随机），展示后由你选择或修改，确认后再提交。
- **定时发布**：填写「发布时间」和「时区」（如 `Asia/Shanghai`、`America/New_York`），脚本会转换成时间戳后提交给 GeeLark。

### 桌面窗口（推荐）

```bash
python tiktok_comment_gui.py
```

会打开一个桌面窗口，可填写 TikTok 链接、评论（支持「AI 生成后确认」弹窗选择）、预定时间与时区、云手机选择，点击「提交定时评论任务」即可。

### 交互式命令行

```bash
python tiktok_comment.py
```

按提示依次输入：TikTok 链接、评论来源（1=手动 / 2=AI 生成后确认）、评论内容或确认 AI 备选、时区、预定发布时间、云手机序号、是否使用亚洲版接口。

### 命令行参数（一次性提交）

```bash
# 列出云手机，获取 phone-id
python tiktok_comment.py --list-phones

# 指定链接、评论、时间、时区、云手机，直接创建任务
python tiktok_comment.py --url "https://www.tiktok.com/..." --comment "Nice!" --schedule "2025-03-20 14:30" --timezone "Asia/Shanghai" --phone-id "云手机ID"

# 使用亚洲版接口
python tiktok_comment.py -u "https://..." -c "太棒了" -s "2025-03-20 14:30" -t "Asia/Shanghai" -p "云手机ID" --asia
```

### 可选：AI 生成评论

在 `.env` 中配置（可选）：

- `OPENAI_API_KEY`：OpenAI API Key，用于生成评论备选。
- `OPENAI_API_BASE`：若使用兼容 OpenAI 的代理，可填 Base URL。
- `OPENAI_MODEL`：模型，默认 `gpt-4o-mini`。

不配置时，脚本会从内置预设中随机给出几条备选，供你选择或修改后确认。

### 在代码中调用

```python
from tiktok_comment import (
    get_cloud_phones,
    schedule_tiktok_comment,
    parse_schedule_time,
    generate_comment_suggestions,
)

# 定时时间（带时区）
schedule_at = parse_schedule_time("2025-03-20 14:30", "Asia/Shanghai")

# 创建评论任务（使用你确认后的评论内容）
result = schedule_tiktok_comment(
    phone_id="云手机ID",
    tiktok_url="https://www.tiktok.com/@xxx/video/xxx",
    comment="确认后的评论内容",
    schedule_at=schedule_at,
    use_asia_api=False,  # 亚洲区账号可改为 True
)
print("taskId:", result["taskId"])
```

---

## 文档与接口路径

- 接口说明以你提供的 **en-doc** 为准。
- 常用路径示例（与文档中 Request URL 一致）：
  - 云手机列表：`phone/list`
  - 任务查询：`task/query`
- 更多路径见 en-doc 中各 API 的 “Request URL”，去掉基础地址后的部分即为 `path`（如 `phone/list`、`task/query`）。

## 安全提醒

- 不要将 `.env` 或任何含 Bearer Token / API Key 的文件提交到 Git。
- 若密钥泄露，请在 GeeLark 控制台重新生成并更新 `.env`。
