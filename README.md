# dsh-mac-lite — MAC轻量

给 macOS 日常使用裁剪出来的轻量 Agent 模式（预设 id：`mac-lite`，显示名：**MAC轻量**）。

## 保留的工具/能力

- `read` / `read_image` / `write` / `edit`（不开 `apply_patch`）
- `glob` / `grep`（文件检索）
- `bash`（可后台任务）+ `job_*` 后台任务管理
- `web_search` / `web_fetch`（网页检索抓取）
- `skill`（技能目录）、`todo_write`、`ask_user_question`、`present`
- `subagent` / `subagent_fork`（需要时再派子代理）
- 上下文压缩（compaction + 大结果裁剪）
- 插件管理工具（仅在有 profile 上下文时出现）

## 刻意不开

- PowerShell 相关（`tool-pwsh`），本模式只跑 macOS
- plan mode（不额外注入规划提示词）
- `workflow` 重型多智能体编排
- 定时任务 `schedule`、goal 相关命令

## 安装/修改

已作为 profile bundle 安装到 web profile。改完 `cordis.patch.yml` 后，
新会话生效；已存在的会话保留启动时的组合。
