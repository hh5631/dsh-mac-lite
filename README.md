# dsh-mac-lite — MAC轻量

给 macOS 日常使用裁剪出来的轻量 Agent 模式。**两个变体**：

| preset id | 显示名 | 执行器 | 适用 |
|---|---|---|---|
| `mac-lite` | MAC轻量 | 原生 | 日常问答、改代码、单点排查 —— **首字最快** |
| `mac-lite-ptc` | MAC轻量·PTC | PTC | 批量遍历、条件分支、多文件审计 —— **一轮跑完多步** |

两者插件裁剪完全相同，**只差执行器一行**。之所以拆成两个 preset：DSH 规定
「最近作用域的执行器决定工具行为；同一作用域只允许一个执行器」
（`dsh-tool-executor-ptc` 文档），塞进同一个 preset 会启动失败。

## 保留的工具/能力

- `read` / `read_image` / `write` / `edit`（`applyPatch: false`，不重复注册 `apply_patch`）
- `glob` / `grep`（文件检索）
- `bash`（`enableRunInBackground: true`）+ `job_*` 后台任务管理
- `web_search` / `web_fetch`（网页检索抓取）
- `skill`（技能目录）、`todo_write`、`ask_user_question`、`present`
- `subagent` / `subagent_fork`（不暴露 `interrupt_agent`）
- Office 文档：`office_render` / `office_convert` / `office_recalculate`
  （仅在加载 `office` 系技能后才进工具目录，空闲时零常驻开销）
- 上下文压缩（compaction + 工具结果修剪，阈值即插件默认值 8192 / 4096 / 1024）
- 插件管理工具（仅在有 profile 上下文时出现）
- **仅 mac-lite-ptc**：`run_code`（PTC 执行器暴露的唯一直接调用入口，其余工具在程序内以 SDK 绑定调用）

## 刻意不开

- PowerShell 相关（`tool-pwsh`），本模式只跑 macOS
- plan mode（不额外注入规划提示词）
- `workflow` 重型多智能体编排
- 定时任务 `schedule`、goal 相关命令 —— 需要时切到「标准」预设
- `persistent-bash`：它与 `tool-bash` 争用同名 `bash` 工具，且**没有 `run_in_background`**。
  跨调用保留 shell 状态的场景用宿主已挂的 `terminal_open` / `terminal_send`，
  那条路径不占用 `bash` 工具名。

## 提示词策略

persona 只保留身份、语言、结论优先和 macOS-only 取向。输出格式、思考纪律、
规划步骤、工具选择、并发与委派、质量闭环这些通用规则已经在用户级
`~/.dsh/AGENTS.md` 里，由 `agent-instructions` 逐请求注入，**persona 里不再重复抄一遍**
——重复等于每轮双倍 token、拖慢首字延迟。要改这些规则请改 AGENTS.md，不是因为
preset 漏了。

## 怎么选变体

- 默认用 **MAC轻量**（mac-lite）。绝大多数任务它是快的那条路。
- 出现「遍历 N 个文件逐个检查」「按条件筛选后再批量处理」「多步结果互相依赖」这类
  一次程序内能自洽跑完的活儿，手动切到 **MAC轻量·PTC**（mac-lite-ptc）。

## 安装

```sh
# 方式一：预构建 tarball（推荐，无需构建授权）
dsh plugin --profile web add https://github.com/hh5631/dsh-mac-lite/releases/latest/download/dsh-mac-lite.tgz

# 方式二：直接从 GitHub 源码安装
dsh plugin --profile web add github:hh5631/dsh-mac-lite

# 方式三：本地克隆后安装
git clone https://github.com/hh5631/dsh-mac-lite.git
dsh plugin --profile web add link:$PWD/dsh-mac-lite
```

安装后**新会话生效**；已有会话保留创建时的组合。

## 安装/修改

已作为 profile bundle 安装到 web profile。改完 `cordis.patch.yml` 后，
**新会话生效**；已存在的会话保留创建时的组合（切换要去界面里改当前会话的预设）。

### 改完自检

```bash
npm run check
```

`scripts/check.mjs` 会依次校验：YAML 语法可解析 → insert 结构正确 → preset `config.id` 唯一
→ 每个 preset 内行 id 作用域内唯一 → 每个 `name` 能从宿主解析 → 每段 `config` 通过对应
插件的 schemastery schema。字段名写错、插件改名、行被宿主移除都会以非 0 退出码报出。
宿主装在非默认路径时，用 `DSH_HOST_PACKAGE` 指定 dsh 的 `package.json`。
