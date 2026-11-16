# dsh-mac-lite — MAC轻量

给 macOS 日常使用裁剪出来的轻量 Agent 模式（预设 id：`mac-lite`，显示名：**MAC轻量**）。

## 保留的工具/能力

- `read` / `read_image` / `write` / `edit`（开着 `applyPatch: false`，不重复注册 `apply_patch`）
- `glob` / `grep`（文件检索）
- `bash`（可后台任务）+ `job_*` 后台任务管理
- `web_search` / `web_fetch`（网页检索抓取）
- `skill`（技能目录）、`todo_write`、`ask_user_question`、`present`
- `subagent` / `subagent_fork`（需要时再派子代理，不暴露 `interrupt_agent`）
- Office 文档：`office_render` / `office_convert` / `office_recalculate`
  （复用宿主已挂的 `office-kit` 与 office 技能；**仅在加载 `office` 系技能后才进工具目录**，空闲时零常驻开销）
- 上下文压缩（compaction + 工具结果修剪，阈值即插件默认值 8192 / 4096 / 1024）
- 插件管理工具（仅在有 profile 上下文时出现）

## 刻意不开

- PowerShell 相关（`tool-pwsh`），本模式只跑 macOS
- plan mode（不额外注入规划提示词）
- `workflow` 重型多智能体编排
- 定时任务 `schedule`、goal 相关命令

## 提示词策略

persona 只保留身份、语言、结论优先和 macOS-only 取向。输出格式、思考纪律、
规划步骤、工具选择、并发与委派、质量闭环这些通用规则已经在用户级
`~/.dsh/AGENTS.md` 里，由 `agent-instructions` 逐请求注入，**persona 里不再重复抄一遍**
——重复等于每轮双倍 token、拖慢首字延迟。要改这些规则请改 AGENTS.md，不是因为
preset 漏了。

## 安装/修改

已作为 profile bundle 安装到 web profile。改完 `cordis.patch.yml` 后，
新会话生效；已存在的会话保留启动时的组合。

### 改完自检

```bash
npm run check
```

`scripts/check.mjs` 会依次校验：YAML 语法可解析 → insert 结构正确 → 行 id 无重复 →
每个 `name` 能从宿主解析 → 每段 `config` 能通过对应插件的 schemastery schema。
字段名写错、插件改名、行被宿主移除都会直接以非 0 退出码报出来。
宿主装在非默认路径时，用 `DSH_HOST_PACKAGE` 指定 dsh 的 `package.json`。
