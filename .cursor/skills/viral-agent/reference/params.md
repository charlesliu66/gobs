# Viral_Agent 参数速查

## 单视频分析

| 参数 | 必填 | 说明 |
|------|------|------|
| `-VideoPath` | 二选一 | 本地视频路径 |
| `-Url` | 二选一 | 视频 URL（支持 yt-dlp 下载） |
| `-SubtitlePath` | 否 | 字幕 .srt/.vtt/.txt，用于 hook/beats 分析 |
| `-OutRoot` | 否 | 输出根目录，默认 `.\out` |
| `-CookiesPath` | 否 | cookies.txt（登录墙内视频） |
| `-CookiesFromBrowser` | 否 | chrome/edge/firefox/brave，用浏览器 cookies |

## 批量分析

| 参数 | 说明 |
|------|------|
| `-VideoPaths` | 本地路径数组 |
| `-Urls` | URL 数组 |
| `-InputListPath` | 文本文件，每行一个路径或 URL，# 开头忽略 |
| `-VideoDir` | 目录内所有视频（非递归） |
| `-VideoDirRecurse` | 递归子目录 |
| `-BatchSummary` | 生成批次汇总 report_batch.xlsx |

## 趋势扫描

| 参数 | 说明 |
|------|------|
| `-TrendQueries` | 搜索关键词，用于 ytsearch20 |
| `-TrendSourceUrls` | 网页 URL，抓取 og:title |
| `-TrendOnly` | 仅跑趋势，不分析视频 |

## 技术参数

| 参数 | 默认 | 说明 |
|------|------|------|
| `-SceneThreshold` | 0.30 | 场景检测阈值 |
| `-SceneFps` | 2.0 | 场景检测采样帧率 |
| `-ContactIntervalSec` | 2.0 | 联系表缩略图间隔（秒） |
| `-YtDlpNoCheckCertificate` | - | 跳过 SSL 校验（内网代理时） |
| `-YtDlpSocketTimeoutSec` | 60 | yt-dlp 超时 |
| `-YtDlpRetries` | 3 | 重试次数 |
