#!/usr/bin/env node
// 自检：YAML 语法 → 行 id 唯一 → name 可解析 → config 通过插件自带的 schemastery schema。
// 字段名写错、插件改名、行被宿主移除都会在这里直接失败，退出码非 0。
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const PATCH = resolve(root, 'cordis.patch.yml')

/** 宿主安装位置（yaml 与全部 @deepseek-ai/* 插件都从这里解析）。 */
const HOST_CANDIDATES = [
  process.env.DSH_HOST_PACKAGE,
  '/opt/homebrew/lib/node_modules/@deepseek-ai/dsh/package.json',
  '/usr/local/lib/node_modules/@deepseek-ai/dsh/package.json',
].filter((p) => typeof p === 'string' && p.length > 0)

function hostRequire() {
  for (const candidate of HOST_CANDIDATES) {
    if (!isAbsolute(candidate)) continue
    try {
      return createRequire(candidate)
    } catch {}
  }
  throw new Error(`找不到宿主 DSH 安装；可用 DSH_HOST_PACKAGE 指定 dsh 的 package.json。试过: ${HOST_CANDIDATES.join(', ')}`)
}

const req = hostRequire()
const YAML = req('yaml')

// !!js 是 Loader 方言里的自定义 tag，这里只做语法校验，按字符串保留。
const jsTag = { tag: 'tag:yaml.org,2002:js', resolve: (value) => String(value) }

let failures = 0
const fail = (msg) => {
  failures += 1
  console.error('  ✗ ' + msg)
}
const ok = (msg) => console.log('  ✓ ' + msg)

let doc
try {
  doc = YAML.parse(readFileSync(PATCH, 'utf8'), { customTags: [jsTag] })
} catch (error) {
  console.error('YAML 解析失败: ' + error.message)
  process.exit(1)
}
ok('YAML 语法可解析')

const insert = Array.isArray(doc) ? doc[0]?.insert : undefined
if (!Array.isArray(insert) || insert.length === 0) {
  fail('patch 顶层应为 [{ insert: [至少一条 preset 声明] }]')
  process.exit(1)
}
ok(`insert 含 ${insert.length} 条 preset 声明`)

const presetIds = []
for (const preset of insert) {
  if (preset.name !== '@deepseek-ai/dsh-agent-preset') fail(`${preset.id}: insert 行的 name 应为 @deepseek-ai/dsh-agent-preset`)
  for (const field of ['id', 'plugins']) {
    if (preset.config?.[field] === undefined) fail(`${preset.id}: preset config 缺少必填字段 ${field}`)
  }
  presetIds.push(preset.config?.id)
}
const dupPreset = [...new Set(presetIds.filter((id, i) => presetIds.indexOf(id) !== i))]
if (dupPreset.length > 0) fail('重复的 preset config.id: ' + dupPreset.join(', '))
else ok(`preset id 唯一（${presetIds.join(', ')}）`)

/** 展开 group 行，得到扁平的 (id, name, config) 列表。 */
const rows = []
const walk = (list) => {
  for (const row of list ?? []) {
    if (row?.name === 'cordis:group') {
      walk(Array.isArray(row.config) ? row.config : undefined)
      continue
    }
    rows.push(row)
  }
}
// 行 id 只需在同一个 preset 作用域内唯一；不同 preset 各在独立 scope，允许同名。
let dupTotal = 0
for (const preset of insert) {
  const scoped = []
  const walkScoped = (list) => {
    for (const row of list ?? []) {
      if (row?.name === 'cordis:group') {
        walkScoped(Array.isArray(row.config) ? row.config : undefined)
        continue
      }
      scoped.push(row)
    }
  }
  walkScoped(preset.config?.plugins)
  const scopedIds = scoped.map((row) => row?.id).filter(Boolean)
  const duplicated = [...new Set(scopedIds.filter((id, i) => scopedIds.indexOf(id) !== i))]
  if (duplicated.length > 0) {
    fail(`${preset.config?.id}: 重复的行 id — ` + duplicated.join(', '))
    dupTotal += duplicated.length
  }
  rows.push(...scoped)
  if (duplicated.length === 0) ok(`${preset.config?.id}: 行 id 作用域内唯一（${scopedIds.length} 行）`)
}
if (dupTotal === 0) ok(`合计 ${rows.length} 行`)

const schemaCache = new Map()
let checked = 0
for (const row of rows) {
  const label = String(row?.id ?? row?.name ?? '(anonymous)')
  if (typeof row?.name !== 'string') {
    fail(`${label}: 缺少 name`)
    continue
  }
  let entry
  try {
    entry = req.resolve(row.name)
  } catch {
    fail(`${label}: 无法从宿主解析 ${row.name}`)
    continue
  }
  if (!schemaCache.has(entry)) schemaCache.set(entry, import(entry))
  let mod
  try {
    mod = await schemaCache.get(entry)
  } catch (error) {
    fail(`${label}: 导入 ${row.name} 失败 — ${error.message}`)
    continue
  }
  const Config = mod.Config
  if (typeof Config !== 'function') {
    checked += 1
    continue
  }
  const config = row.config ?? {}
  try {
    Config(config)
  } catch (error) {
    fail(`${label}: config 未通过 ${row.name} 的 schema — ${error.message}`)
    continue
  }
  // schemastery 会原样透传未知键，所以额外比对 Config.dict 的键集合，
  // 这样写错字段名（例如 applyPatch 写成 apply_patch）才会被抓住。
  const known = Config.dict && typeof Config.dict === 'object' ? Object.keys(Config.dict) : undefined
  if (known !== undefined && known.length > 0) {
    const unknown = Object.keys(config).filter((key) => !known.includes(key))
    if (unknown.length > 0) {
      fail(`${label}: ${row.name} 不认识字段 ${unknown.join(', ')}（可用: ${known.join(', ')}）`)
      continue
    }
  }
  checked += 1
}
if (checked === rows.length) ok(`${checked} 行 config 全部通过对应 schema`)

if (failures > 0) {
  console.error(`\n失败 ${failures} 项`)
  process.exit(1)
}
console.log('\n全部通过')