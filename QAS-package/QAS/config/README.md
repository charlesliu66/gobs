# 配置文件

## geelark.json

GeeLark 相关配置，供 geelark-publish、video-create-distribute 等脚本读取。

| 字段 | 说明 |
|------|------|
| `appId` | GeeLark 团队 App ID |
| `apiKey` | Bearer Token，留空则使用环境变量 `GEELARK_API_KEY` |
| `devices` | 各台云手机信息（id、name、region 等） |
| `defaultEnvIds` | 默认发布目标云手机 ID 列表 |
| `aiVideosPath` | Ai Videos 目录路径 |
| `latestJsonPath` | latest.json 路径（video-pipeline 成片元数据） |

**安全**：若填写 `apiKey`，建议将 `geelark.json` 加入 `.gitignore` 或使用环境变量。

---

## geelark-accounts.json

TT 账号与 GeeLark 设备的映射表，供 H5 视频分发使用。H5 仅展示账号信息，用户选择账号后，后端根据此表解析 envId 调用 GeeLark API。

| 字段 | 说明 |
|------|------|
| `accounts` | 账号数组 |
| `accounts[].id` | 账号唯一标识，用于前端选择 |
| `accounts[].username` | 展示用，如 @senja66612 |
| `accounts[].envId` | 对应的 GeeLark 云手机 ID |
| `accounts[].region` | 地区，用于筛选（如 印尼、美国） |
| `accounts[].platform` | 社媒平台，用于筛选（如 TT、INS） |
| `accounts[].remark` | 备注（可选） |
| `accounts[].canPost` | 是否可发布，默认 true |

**示例**：复制 `geelark-accounts.json.example` 为 `geelark-accounts.json`，填入你的账号与设备映射。也可在 `geelark.json` 中增加 `accounts` 字段。
