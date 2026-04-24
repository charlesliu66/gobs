# Challenger Review: Legacy Path Fallbacks

## Must-Fix Review

### 1. 回退路径不能扩大用户可见范围

- Risk: output gallery 与 editor project fallback 如果只按“文件存在”回退，可能把不属于当前账号的旧数据带出来。
- Resolution: 旧路径回退仍保留按 username 限定的目录边界，只在目标账号路径存在时读取或复制。
- Status: cleared

### 2. 兼容逻辑不能覆盖 shared-data 中已有新数据

- Risk: 自动迁移如果总是覆盖，会把新目录里的新版本项目或新索引冲掉。
- Resolution: editor project rehome 与 dual-env init migration 都使用“目标不存在才补”的策略。
- Status: cleared

### 3. 路径回退不能继续写死单一 cwd

- Risk: staging/prod/api 与旧 qas-h5/api 的工作目录不同，单一路径拼接会再次失效。
- Resolution: GeeLark config、Imagen script、output roots 均改为多候选路径解析，并附带 targeted tests。
- Status: cleared

## Residual Risk

- `PRODUCT.md` / `CHANGELOG.md` 仍是历史非 UTF-8 文档，本轮只做了保守 ASCII 插入，没有统一整理整份文件编码。

