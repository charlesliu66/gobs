# GOBS Platform Memory System Design

更新时间：2026-04-09

## 目标

在保留现有功能不拆的前提下，为 GOBS 增加一层平台化入口，并补齐“记忆系统 + 反馈系统 + 学习闭环”。

目标不是做一个静态知识库，而是做一个会持续学习的运营系统：

1. 记住每个游戏的基础事实与阶段上下文
2. 记住哪些内容策略、渠道策略、KOL 策略有效
3. 记住每次 Action 建议、人工调整、最终执行
4. 记住执行后的结果表现与 ROI 变化
5. 将这些反馈回写成策略权重和推荐优先级调整

---

## 一、核心闭环

```text
Data Ingestion
→ Insight Engine
→ Action Suggestion
→ Human Approval / Auto Execution
→ Execution Log
→ Performance Monitoring
→ Feedback Event
→ Strategy Weight Update
→ Next Best Action
```

核心原则：

- **建议不等于学习**：只有建议后的执行和结果，才能形成有效学习
- **拒绝也是信号**：用户拒绝某类 Action，不是失败，而是监督数据
- **人工修改更有价值**：说明系统方向可能对，但参数或表达不对
- **风险动作单独建模**：尤其是舆情、对外回复、社区危机等，不应和低风险内容动作混在一起调权

---

## 二、记忆分层

### L1. Fact Memory（事实记忆）

存储稳定事实：

- game_id / game_name / genre / stage / region
- 发行节点、版本计划、目标市场
- 合规规则、禁用表达、敏感内容边界
- 渠道账号、素材目录、KOL 名单映射

用途：

- 给所有 Agent 提供统一上下文
- 避免在不同页面、不同任务里重复配置同一游戏信息

### L2. Pattern Memory（经验记忆）

存储模式化经验：

- 不同游戏类型下高表现内容模板
- 渠道偏好（TikTok/Meta/YouTube/KOL）
- 钩子结构、镜头节奏、文案风格
- 各阶段 benchmark（正常完播率、CPM 范围、CTR 区间）

用途：

- 让系统的建议越来越像“懂业务的人”
- 给新游戏快速继承历史经验

### L3. Action Memory（行为记忆）

记录动作本身：

- 建议来源（规则 / LLM / 人工）
- 动作类型（内容生产 / 分发 / KOL / 舆情 / 买量）
- 风险等级
- 是否采纳、是否修改、是否拒绝
- 最终执行参数

用途：

- 让系统知道做过什么、哪些建议经常被拒绝
- 让后续分析可以回溯到具体动作

### L4. Feedback Memory（反馈记忆）

记录动作后的结果：

- 播放量 / CTR / CVR / CPM / ROI
- 留存 / 下载 / 注册 / 付费等业务指标（如有）
- 评论情绪 / 舆情风险 / 用户投诉
- 执行前后快照对比
- 正反馈 / 负反馈 / 风险规避信号

用途：

- 形成可计算的学习事件
- 驱动策略权重调整

---

## 三、建议的数据表

## 1. memory_game_profile

```sql
CREATE TABLE memory_game_profile (
  id BIGSERIAL PRIMARY KEY,
  game_id VARCHAR(64) NOT NULL,
  game_name VARCHAR(255) NOT NULL,
  genre VARCHAR(64),
  stage VARCHAR(32),
  region VARCHAR(64),
  languages JSONB,
  audience JSONB,
  compliance_rules JSONB,
  business_goals JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 2. memory_content_pattern

```sql
CREATE TABLE memory_content_pattern (
  id BIGSERIAL PRIMARY KEY,
  pattern_id VARCHAR(64) NOT NULL,
  game_scope VARCHAR(64),
  genre_scope VARCHAR(64),
  stage_scope VARCHAR(32),
  channel VARCHAR(64),
  content_type VARCHAR(64),
  tags JSONB,
  success_score NUMERIC(8,2) DEFAULT 0,
  confidence_score NUMERIC(8,2) DEFAULT 0,
  evidence_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 3. memory_action_log

```sql
CREATE TABLE memory_action_log (
  id BIGSERIAL PRIMARY KEY,
  action_id VARCHAR(64) NOT NULL,
  game_id VARCHAR(64) NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  action_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  risk_level VARCHAR(16) NOT NULL,
  suggestion_payload JSONB,
  decision_status VARCHAR(32) NOT NULL,
  decision_reason TEXT,
  executed_payload JSONB,
  approved_by VARCHAR(128),
  executed_by VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 4. memory_performance_snapshot

```sql
CREATE TABLE memory_performance_snapshot (
  id BIGSERIAL PRIMARY KEY,
  snapshot_id VARCHAR(64) NOT NULL,
  action_id VARCHAR(64),
  game_id VARCHAR(64) NOT NULL,
  channel VARCHAR(64),
  metric_window VARCHAR(32),
  views BIGINT,
  completion_rate NUMERIC(8,4),
  ctr NUMERIC(8,4),
  cvr NUMERIC(8,4),
  cpm NUMERIC(10,4),
  roi NUMERIC(10,4),
  sentiment_score NUMERIC(8,4),
  extra_metrics JSONB,
  captured_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 5. memory_feedback_event

```sql
CREATE TABLE memory_feedback_event (
  id BIGSERIAL PRIMARY KEY,
  feedback_id VARCHAR(64) NOT NULL,
  action_id VARCHAR(64) NOT NULL,
  game_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  decision_type VARCHAR(32) NOT NULL,
  outcome_type VARCHAR(32) NOT NULL,
  result_summary TEXT,
  user_feedback TEXT,
  system_learning TEXT,
  weight_delta NUMERIC(8,2) DEFAULT 0,
  priority_delta NUMERIC(8,2) DEFAULT 0,
  risk_delta NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 6. memory_strategy_weight

```sql
CREATE TABLE memory_strategy_weight (
  id BIGSERIAL PRIMARY KEY,
  strategy_id VARCHAR(64) NOT NULL,
  game_scope VARCHAR(64),
  genre_scope VARCHAR(64),
  stage_scope VARCHAR(32),
  region_scope VARCHAR(64),
  channel_scope VARCHAR(64),
  weight NUMERIC(8,2) NOT NULL,
  priority_score NUMERIC(8,2) NOT NULL,
  confidence_score NUMERIC(8,2) DEFAULT 0,
  mode VARCHAR(32) NOT NULL,
  last_updated_reason TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 四、关键 API 草案

### 1. 游戏与记忆基础

- `GET /api/platform/games`
- `POST /api/platform/games`
- `GET /api/platform/games/:gameId/memory-profile`
- `PUT /api/platform/games/:gameId/memory-profile`

### 2. 资料上传与知识提取

- `POST /api/platform/games/:gameId/files`
- `GET /api/platform/games/:gameId/files`
- `POST /api/platform/games/:gameId/brain/rebuild`
- `GET /api/platform/games/:gameId/brain`

### 3. Action 与执行

- `GET /api/platform/games/:gameId/actions`
- `POST /api/platform/actions/:actionId/accept`
- `POST /api/platform/actions/:actionId/reject`
- `POST /api/platform/actions/:actionId/modify`
- `POST /api/platform/actions/:actionId/execute`

### 4. 反馈与学习

- `POST /api/platform/actions/:actionId/performance-snapshot`
- `POST /api/platform/actions/:actionId/feedback`
- `GET /api/platform/games/:gameId/feedback-events`
- `GET /api/platform/games/:gameId/strategy-weights`
- `POST /api/platform/games/:gameId/strategy-recalculate`

---

## 五、建议的学习规则（MVP）

先不要上来就做复杂强化学习，先做清晰的规则调权：

### 正反馈

触发条件示例：
- CTR > 同阶段均值 + 15%
- CVR > 同阶段均值 + 10%
- ROI 为正，且达到设定阈值

动作：
- weight +5 ~ +15
- priority +3 ~ +10
- evidence_count +1

### 负反馈

触发条件示例：
- CPM 明显上升且 CVR 下降
- 评论负向情绪急升
- ROI 连续两期为负

动作：
- weight -5 ~ -15
- priority -4 ~ -12
- 高风险场景触发 review_required

### 人工拒绝

触发条件示例：
- 用户明确拒绝某类 Action
- 用户连续多次不接受同类建议

动作：
- priority 下降
- 若高风险，则 risk_level 上升
- 建议记录 `decision_reason`

### 人工修改

触发条件示例：
- 用户接受方向但改了语言、节奏、受众、预算、渠道

动作：
- 不直接把原策略判失败
- 记录“建议方向正确但参数需要修正”
- 后续将修改后的参数作为更高优先级候选

---

## 六、前端页面建议

本次前端建议新增三个正式页面：

1. **平台框架总览** `/platform`
   - 登录后统一入口
   - 展示主流程、游戏绑定、知识库、数据、洞察、Action

2. **平台记忆系统** `/platform/memory`
   - 记忆分层
   - 策略权重面板
   - Feedback Timeline

3. **学习实验台** `/platform/learning-lab`
   - mock 一次 Action 学习闭环
   - 演示接受/拒绝/人工修改后，系统如何更新权重

---

## 七、风险与注意事项

### 1. 不要把“知识库”和“记忆系统”混为一谈

知识库偏事实；记忆系统必须包含：
- 动作
- 决策
- 结果
- 调权

### 2. 高风险动作必须单独建模

尤其是：
- 舆情回复
- 官方对外话术
- 自动社区互动
- 可能涉及品牌风险的内容动作

这些动作不能只看效果好不好，还要看是否安全。

### 3. 数据快照必须跟 Action 绑定

如果没有 action_id → performance snapshot 的关系，后续很难归因。

### 4. 不要一开始就追求复杂算法

MVP 阶段：
- 先规则调权
- 再做置信度
- 最后再考虑更复杂的模型学习

---

## 八、交付建议

第一阶段（现在）
- 完成前端框架页
- 完成记忆系统页
- 完成学习实验台页
- 输出 schema / API 设计文档

第二阶段
- 接真实游戏与文件上传接口
- 接 action log 与 feedback event 存储
- 打通 performance snapshot

第三阶段
- 上策略调权服务
- 上跨游戏经验迁移
- 上 benchmark 自动更新

---

## 结论

这套系统的核心不是“AI 会建议”，而是：

**平台要能记住自己为什么建议、做了什么、结果如何、以后要不要继续这么做。**

只有这样，GOBS 才不是一个功能拼盘，而是一个真正会积累运营智能的平台。
