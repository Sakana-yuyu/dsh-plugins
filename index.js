import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const name = 'dsh-plugins-catalog'
export const inject = ['tools', 'webServer']

const CATALOG_BASE = 'https://sakana-yuyu.github.io/dsh-plugins'
const SELF_FULL = 'Sakana-yuyu/dsh-plugins'
const PREFS_NAME = 'dsh-plugins-prefs.json'
const DEFAULT_PREFS = {
  showSidebar: true,
  coverSize: 'large',
  autoUpdateSelf: true,
  autoUpdateOthers: false,
  lastCheck: 0,
  lastSelfSha: '',
}
const CATS = {
  official: { zh: '官方核心', en: 'Official core' },
  ui: { zh: 'UI 与皮肤', en: 'UI & skins' },
  vision: { zh: '视觉', en: 'Vision' },
  tui: { zh: '终端 TUI', en: 'Terminal TUI' },
  desktop: { zh: '桌面客户端', en: 'Desktop' },
  browser: { zh: '浏览器', en: 'Browser' },
  workflow: { zh: '工作流与多智能体', en: 'Workflow & agents' },
  tools: { zh: '工具与技能', en: 'Tools & skills' },
  search: { zh: '搜索与研究', en: 'Search & research' },
  dev: { zh: '开发与代码', en: 'Dev & code' },
  awesome: { zh: '目录与精选', en: 'Awesome lists' },
  other: { zh: '其他', en: 'Other' },
}

const PLACEHOLDER_WARN = '该插件仓库的包不在根目录，需要子目录信息，请向目录维护者补充 path 字段'
const BUILTIN_PATHS = {
  'Small-tailqwq/dsh-deep-whale': 'maid-atelier',
}

function sanitizePath(raw) {
  const s = String(raw || '').trim().replace(/^\/+|\/+$/g, '')
  if (!s || s.includes('..') || !/^[A-Za-z0-9_./-]+$/.test(s)) return ''
  return s
}

function githubSpec(fullName, path) {
  const full = String(fullName || '').trim()
  const sub = sanitizePath(path)
  return sub ? ('github:' + full + '#path:' + sub) : ('github:' + full)
}

function parseGithubSpec(spec) {
  let s = String(spec || '').trim()
  if (s.startsWith('github:')) s = s.slice(7)
  const q = s.indexOf('?')
  if (q >= 0) s = s.slice(0, q)
  let frag = ''
  const hash = s.indexOf('#')
  let rest = s
  if (hash >= 0) {
    rest = s.slice(0, hash)
    frag = s.slice(hash + 1)
  }
  rest = rest.replace(/\.git$/, '')
  let path = ''
  if (frag) {
    const parts = frag.split('&')
    for (const part of parts) {
      if (part.startsWith('path:')) {
        path = sanitizePath(decodeURIComponent(part.slice(5)))
        break
      }
    }
  }
  return { full_name: rest, path, spec: githubSpec(rest, path) }
}

function toUpdateSpec(item) {
  if (!item) return ''
  if (typeof item === 'string') {
    const raw = item.startsWith('github:') ? item : ('github:' + item)
    return parseGithubSpec(raw).spec
  }
  if (item.spec) return parseGithubSpec(item.spec).spec
  return githubSpec(item.full_name, item.path)
}

function isPlaceholderPkg(pkg) {
  return !!(pkg && typeof pkg === 'object' && pkg._pnpmPlaceholder)
}

function expand(p) {
  const path = sanitizePath(p && (p.p || p.path))
  if (p && p.full_name && p.name && p.category) {
    if (path) return { ...p, path }
    if (p.path) {
      const next = { ...p }
      delete next.path
      return next
    }
    return p
  }
  const cat = (p && (p.c || p.category)) || 'other'
  const labels = CATS[cat] || CATS.other
  const full = (p && (p.f || p.full_name)) || ''
  const out = {
    rank: p.r || p.rank,
    name: p.n || p.name,
    full_name: full,
    html_url: p.u || p.html_url || ('https://github.com/' + full),
    description_zh: p.z || p.description_zh,
    description_en: p.e || p.description_en,
    description: p.z || p.e || p.description,
    stars: p.s || p.stars || 0,
    language: p.l || p.language,
    official: !!(p.o || p.official),
    category: cat,
    category_zh: p.category_zh || labels.zh,
    category_en: p.category_en || labels.en,
    clone_url: p.clone_url || ('https://github.com/' + full + '.git'),
  }
  if (path) out.path = path
  return out
}

function applyPathOverride(item, overrides) {
  if (!item || item.path) return item
  const ov = sanitizePath(overrides && overrides[item.full_name])
  if (!ov) return item
  return { ...item, path: ov }
}

function installCmd(fullName, profile, path) {
  return 'dsh plugin --profile ' + (profile || 'web') + ' add "' + githubSpec(fullName, path) + '"'
}

let cache = null
async function loadCatalog() {
  if (cache) return cache
  const parts = await Promise.all(Array.from({ length: 26 }, (_, i) =>
    fetch(CATALOG_BASE + '/s' + (i + 1) + '.json').then(r => r.ok ? r.json() : []).catch(() => [])
  ))
  let items = parts.flat().map(expand)
  if (items.length < 20) {
    const seed = await fetch(CATALOG_BASE + '/catalog.json').then(r => r.ok ? r.json() : []).catch(() => [])
    items = seed.map(expand)
  }
  const remotePaths = await fetch(CATALOG_BASE + '/path-overrides.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
  const overrides = { ...BUILTIN_PATHS, ...(remotePaths && typeof remotePaths === 'object' ? remotePaths : {}) }
  items = items.map(item => applyPathOverride(item, overrides))
  cache = items
  return items
}

function filterItems(items, query, category, officialOnly) {
  const q = (query || '').trim().toLowerCase()
  return items.filter(p => {
    if (officialOnly && !p.official) return false
    if (category && category !== 'all' && p.category !== category) return false
    if (!q) return true
    const blob = [p.name, p.full_name, p.description, p.description_zh, p.description_en].join(' ').toLowerCase()
    return blob.includes(q)
  })
}

function row(p) {
  const out = {
    rank: p.rank,
    name: p.name,
    full_name: p.full_name,
    stars: p.stars,
    official: p.official,
    category: p.category_zh || p.category,
    install: installCmd(p.full_name, 'web', p.path),
    spec: githubSpec(p.full_name, p.path),
    clone: p.clone_url,
    url: p.html_url,
    description: p.description_zh || p.description || p.description_en,
  }
  if (p.path) out.path = p.path
  return out
}

function apiRow(p) {
  const r = row(p)
  const full = r.full_name || ''
  const slash = full.indexOf('/')
  const out = {
    rank: r.rank,
    name: r.name,
    full_name: full,
    author: slash > 0 ? full.slice(0, slash) : '',
    stars: r.stars,
    official: r.official,
    category: p.category,
    category_zh: p.category_zh || r.category,
    description: r.description,
    description_zh: p.description_zh || '',
    description_en: p.description_en || '',
    install: r.install,
    spec: r.spec,
    url: r.url,
  }
  if (p.path || r.path) out.path = p.path || r.path
  return out
}

function validFullName(full) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full)
}

function safeProfile(value) {
  return String(value || 'web').replace(/[^A-Za-z0-9_-]/g, '') || 'web'
}

function userHome() {
  return process.env.USERPROFILE || process.env.HOME || ''
}

function resolveDshHome() {
  if (process.env.DSH_HOME) return process.env.DSH_HOME
  const home = userHome()
  if (home) {
    const desk = join(home, 'DeepSeek Harness', 'dsh-home')
    if (existsSync(desk)) return desk
    const dot = join(home, '.dsh')
    if (existsSync(dot)) return dot
  }
  return process.cwd()
}

function prefsPath() {
  return join(resolveDshHome(), PREFS_NAME)
}

function loadPrefs() {
  const out = { ...DEFAULT_PREFS }
  try {
    const raw = readFileSync(prefsPath(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.showSidebar === 'boolean') out.showSidebar = parsed.showSidebar
      if (parsed.coverSize === 'medium' || parsed.coverSize === 'large') out.coverSize = parsed.coverSize
      if (typeof parsed.autoUpdateSelf === 'boolean') out.autoUpdateSelf = parsed.autoUpdateSelf
      if (typeof parsed.autoUpdateOthers === 'boolean') out.autoUpdateOthers = parsed.autoUpdateOthers
      if (typeof parsed.lastCheck === 'number') out.lastCheck = parsed.lastCheck
      if (typeof parsed.lastSelfSha === 'string') out.lastSelfSha = parsed.lastSelfSha
    }
  } catch {}
  return out
}

function savePrefs(prefs) {
  const next = { ...DEFAULT_PREFS, ...prefs }
  writeFileSync(prefsPath(), JSON.stringify(next, null, 2))
  return next
}

function mergePrefs(body) {
  const cur = loadPrefs()
  if (!body || typeof body !== 'object') return savePrefs(cur)
  if (typeof body.showSidebar === 'boolean') cur.showSidebar = body.showSidebar
  if (body.coverSize === 'medium' || body.coverSize === 'large') cur.coverSize = body.coverSize
  if (typeof body.autoUpdateSelf === 'boolean') cur.autoUpdateSelf = body.autoUpdateSelf
  if (typeof body.autoUpdateOthers === 'boolean') cur.autoUpdateOthers = body.autoUpdateOthers
  if (typeof body.lastCheck === 'number') cur.lastCheck = body.lastCheck
  if (typeof body.lastSelfSha === 'string') cur.lastSelfSha = body.lastSelfSha
  return savePrefs(cur)
}

function webPackageCandidates() {
  const homes = []
  if (process.env.DSH_HOME) homes.push(process.env.DSH_HOME)
  const home = userHome()
  if (home) {
    homes.push(join(home, 'DeepSeek Harness', 'dsh-home'))
    homes.push(join(home, '.dsh'))
  }
  homes.push(resolveDshHome())
  homes.push(process.cwd())
  const paths = []
  const seen = new Set()
  for (const h of homes) {
    const p = join(h, 'profiles', 'web', 'package.json')
    if (!seen.has(p)) { seen.add(p); paths.push(p) }
  }
  if (!seen.has('profiles/web/package.json')) paths.push('profiles/web/package.json')
  return paths
}

function collectInstalledGithub() {
  const out = []
  const seen = new Set()
  for (const p of webPackageCandidates()) {
    let pkg
    try {
      if (!existsSync(p)) continue
      pkg = JSON.parse(readFileSync(p, 'utf8'))
    } catch { continue }
    if (!pkg || typeof pkg !== 'object') continue
    const root = dirname(p)
    for (const bag of [pkg.dependencies, pkg.devDependencies]) {
      if (!bag || typeof bag !== 'object') continue
      for (const [depName, spec] of Object.entries(bag)) {
        const s = String(spec || '')
        if (!s.startsWith('github:')) continue
        const parsed = parseGithubSpec(s)
        if (!validFullName(parsed.full_name)) continue
        const key = parsed.spec
        if (seen.has(key)) continue
        seen.add(key)
        let placeholder = false
        let warning = ''
        try {
          const nm = join(root, 'node_modules', depName, 'package.json')
          if (existsSync(nm)) {
            const np = JSON.parse(readFileSync(nm, 'utf8'))
            if (isPlaceholderPkg(np)) {
              placeholder = true
              warning = PLACEHOLDER_WARN
            }
          }
        } catch {}
        out.push({
          full_name: parsed.full_name,
          path: parsed.path,
          spec: s,
          name: depName,
          placeholder,
          warning,
        })
      }
    }
    if (out.length) return out
  }
  return out
}

function allUpdateFulls() {
  const items = collectInstalledGithub()
  const specs = items.map(toUpdateSpec).filter(Boolean)
  if (!items.some(x => x.full_name === SELF_FULL)) specs.push(githubSpec(SELF_FULL, ''))
  return specs
}

async function fetchSelfSha() {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10000)
  try {
    const r = await fetch('https://api.github.com/repos/Sakana-yuyu/dsh-plugins/commits/main', {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'dsh-plugins-catalog',
      },
      signal: ac.signal,
    })
    if (!r.ok) return ''
    const data = await r.json()
    const sha = String((data && data.sha) || '')
    return sha ? sha.slice(0, 7) : sha
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

async function checkUpdates(persist) {
  const prefs = loadPrefs()
  const latestSha = await fetchSelfSha()
  const current = prefs.lastSelfSha || ''
  const newer = !!(current && latestSha && current !== latestSha)
  const checkedAt = Date.now()
  if (persist) {
    prefs.lastCheck = checkedAt
    if (latestSha && !prefs.lastSelfSha) prefs.lastSelfSha = latestSha
    savePrefs(prefs)
  }
  const installed = collectInstalledGithub()
  return {
    ok: true,
    self: { full_name: SELF_FULL, current, latestSha, newer },
    installed,
    warnings: installed.filter(x => x.warning).map(x => x.full_name + ': ' + x.warning),
    checkedAt,
  }
}

let nodeCp = null
let nodeFs = null
async function loadNodeMods() {
  if (!nodeCp) nodeCp = await import('node:child_process')
  if (!nodeFs) nodeFs = await import('node:fs')
  return { spawn: nodeCp.spawn, spawnSync: nodeCp.spawnSync, existsSync: nodeFs.existsSync }
}

function commandExistsSync(spawnSync, name) {
  const checker = process.platform === 'win32' ? 'where' : 'which'
  try {
    const r = spawnSync(checker, [name], { encoding: 'utf8', windowsHide: true, timeout: 5000 })
    return r.status === 0 && String(r.stdout || '').trim().length > 0
  } catch {
    return false
  }
}

function findPowerShellHost(spawnSync, existsSync) {
  if (commandExistsSync(spawnSync, 'pwsh') || existsSync('C:\\Program Files\\PowerShell\\7\\pwsh.exe')) return 'pwsh'
  if (commandExistsSync(spawnSync, 'powershell') || commandExistsSync(spawnSync, 'powershell.exe') ||
      existsSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')) {
    return 'powershell.exe'
  }
  return process.platform === 'win32' ? 'powershell.exe' : ''
}

function psHomeDetect() {
  return [
    "if (-not $env:DSH_HOME) {",
    "  $desk = Join-Path $env:USERPROFILE 'DeepSeek Harness\\dsh-home';",
    "  $dot = Join-Path $env:USERPROFILE '.dsh';",
    "  if (Test-Path -LiteralPath $desk) { $env:DSH_HOME = $desk }",
    "  elseif (Test-Path -LiteralPath $dot) { $env:DSH_HOME = $dot }",
    "}",
    "Write-Host ('DSH_HOME=' + $env:DSH_HOME)",
  ]
}

function specFromItem(item) {
  if (!item) return ''
  if (typeof item === 'string') return toUpdateSpec(item)
  return githubSpec(item.full_name, item.path)
}

function psAddOne(item, profile) {
  const spec = specFromItem(item)
  return [
    "if (Get-Command dsh -ErrorAction SilentlyContinue) {",
    "  dsh plugin --profile " + profile + " add \"" + spec + "\"",
    "} elseif (Get-Command npx -ErrorAction SilentlyContinue) {",
    "  npx --yes @deepseek-ai/dsh plugin --profile " + profile + " add \"" + spec + "\"",
    "} else {",
    "  Write-Host '找不到 dsh 或 npx，请先安装 Node.js 或把 dsh 加到 PATH'",
    "}",
  ]
}

function buildPsScript(item, profile) {
  return psHomeDetect().concat(psAddOne(item, profile), ["Write-Host '完成。请重启 DSH / dsh-desktop。'"]).join('; ')
}

function buildPsUpdateAll(items, profile) {
  const specs = (items || []).map(specFromItem).filter(s => {
    const parsed = parseGithubSpec(s)
    return validFullName(parsed.full_name)
  })
  const list = specs.map(s => "'" + String(s).replace(/'/g, '') + "'").join(',')
  return psHomeDetect().concat([
    "$repos = @(" + list + ")",
    "foreach ($f in $repos) {",
    "  Write-Host ('更新 ' + $f)",
    "  if (Get-Command dsh -ErrorAction SilentlyContinue) {",
    "    dsh plugin --profile " + profile + " add $f",
    "  } elseif (Get-Command npx -ErrorAction SilentlyContinue) {",
    "    npx --yes @deepseek-ai/dsh plugin --profile " + profile + " add $f",
    "  } else {",
    "    Write-Host '找不到 dsh 或 npx，请先安装 Node.js 或把 dsh 加到 PATH'; break",
    "  }",
    "}",
    "Write-Host '完成。请重启 DSH / dsh-desktop。'",
  ]).join('; ')
}

async function launchVisiblePowerShell(script, title) {
  const { spawn, spawnSync, existsSync } = await loadNodeMods()
  const shell = findPowerShellHost(spawnSync, existsSync) || 'powershell.exe'
  const winTitle = title || '安装插件'
  return new Promise((resolve, reject) => {
    let child
    if (process.platform === 'win32') {
      // cmd `start` treats the first unquoted token as a filename (the Windows
      // dialog "找不到文件 '安装插件'" ). A title with a space is quoted by Node,
      // so start uses it as the window title instead.
      child = spawn('cmd.exe', ['/c', 'start', 'DSH plugin', shell, '-NoExit', '-Command', script], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      })
    } else {
      child = spawn(shell, ['-NoExit', '-Command', script], {
        detached: true,
        stdio: 'ignore',
      })
    }
    child.on('error', reject)
    child.unref()
    resolve()
  })
}

async function spawnNamed(bin, args) {
  const { spawn } = await loadNodeMods()
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (err) => resolve({ code: 127, stdout, stderr: String(err) }))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function installViaNpxOrDsh(item, profile) {
  const spec = specFromItem(item)
  const npxArgs = ['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', profile, 'add', spec]
  let result = await spawnNamed('npx', npxArgs)
  if (result.code !== 0) {
    const dsh = await spawnNamed('dsh', ['plugin', '--profile', profile, 'add', spec])
    result = {
      code: dsh.code,
      stdout: (result.stdout || '') + (dsh.stdout || ''),
      stderr: (result.stderr || '') + (dsh.stderr || ''),
    }
  }
  return result
}

async function launchAdd(items, profile, title) {
  const parsed = (items || []).map(specFromItem).map(parseGithubSpec)
  const command = parsed.map(x => installCmd(x.full_name, profile, x.path)).join(' && ')
  const { spawnSync, existsSync } = await loadNodeMods()
  const useWin = process.platform === 'win32' || !!findPowerShellHost(spawnSync, existsSync)
  if (useWin) {
    const script = parsed.length === 1 ? buildPsScript(parsed[0], profile) : buildPsUpdateAll(parsed, profile)
    try {
      await launchVisiblePowerShell(script, title)
      return {
        ok: true,
        launched: true,
        needsRestart: true,
        message: title === '更新插件'
          ? '已打开 PowerShell 更新窗口，完成后请重启 DSH'
          : '已打开 PowerShell 安装窗口，完成后请重启 DSH',
        command,
        targets: parsed.map(x => x.spec),
      }
    } catch (err) {
      return {
        ok: false,
        launched: false,
        needsRestart: true,
        message: String(err && err.message || err),
        command,
        targets: parsed.map(x => x.spec),
        stdout: '',
        stderr: String(err && err.message || err),
      }
    }
  }
  let ok = true
  let stdout = ''
  let stderr = ''
  for (const item of parsed) {
    const result = await installViaNpxOrDsh(item, profile)
    stdout += result.stdout || ''
    stderr += result.stderr || ''
    if (result.code !== 0) ok = false
  }
  return {
    ok,
    launched: false,
    needsRestart: true,
    message: ok ? (title === '更新插件' ? 'updated' : 'installed') : ((stderr || '').slice(-500) || 'failed'),
    command,
    targets: parsed.map(x => x.spec),
    stdout: stdout.slice(-4000),
    stderr: stderr.slice(-4000),
  }
}

async function installPlugin(full, profile, path) {
  return launchAdd([githubSpec(full, path)], profile, '安装插件')
}

function resolveUpdateFulls(target) {
  const t = String(target || '').trim()
  if (t === 'self') return [githubSpec(SELF_FULL, '')]
  if (t === 'all') return allUpdateFulls()
  if (t.startsWith('github:') || t.includes('#path:') || validFullName(t.split('#')[0])) {
    const parsed = parseGithubSpec(t.startsWith('github:') ? t : ('github:' + t))
    if (!validFullName(parsed.full_name)) return null
    return [parsed.spec]
  }
  return null
}

async function runUpdate(target, profile) {
  const fulls = resolveUpdateFulls(target)
  if (!fulls || !fulls.length) {
    return { ok: false, message: 'target must be self, all, or owner/repo', targets: [] }
  }
  return launchAdd(fulls, safeProfile(profile), '更新插件')
}

const DETAIL_TTL_MS = 10 * 60 * 1000
const detailCache = new Map()

function extractImgs(md, full) {
  const out = []
  const add = (u) => {
    if (!u) return
    u = String(u).trim().replace(/^<|>$/g, '').split(/\s+/)[0].replace(/["']/g, '')
    if (!u || u.startsWith('#') || /^data:/i.test(u)) return
    const low = u.toLowerCase()
    if (/shields\.io|badge|github\.com\/actions|camo\.githubusercontent/.test(low)) return
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://raw.githubusercontent.com/' + full + '/HEAD/' + u.replace(/^\.?\//, '')
    }
    if (!out.includes(u)) out.push(u)
  }
  String(md || '').replace(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, u) => { add(u); return '' })
  String(md || '').replace(/<img[^>]+src=["']([^"']+)["']/gi, (_, u) => { add(u); return '' })
  return out
}

async function fetchText(url, timeoutMs) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs || 8000)
  try {
    const r = await fetch(url, { signal: ac.signal })
    if (!r.ok) return ''
    return await r.text()
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

function clipText(s, n) {
  s = String(s || '')
  if (s.length <= n) return s
  return s.slice(0, n)
}

async function loadDetail(full) {
  const hit = detailCache.get(full)
  if (hit && (Date.now() - hit.at) < DETAIL_TTL_MS) return hit.data
  const base = 'https://raw.githubusercontent.com/' + full + '/HEAD/'
  const readmeEn = await fetchText(base + 'README.md', 8000)
  let readmeZh = await fetchText(base + 'README.zh-CN.md', 8000)
  if (!readmeZh) readmeZh = await fetchText(base + 'README.zh.md', 8000)
  const images = []
  for (const u of extractImgs(readmeZh, full).concat(extractImgs(readmeEn, full))) {
    if (!images.includes(u)) images.push(u)
  }
  const og = 'https://opengraph.githubassets.com/1/' + full
  if (!images.length) images.push(og)
  const data = {
    ok: true,
    full_name: full,
    images: images.slice(0, 16),
    readme_zh: clipText(readmeZh, 20000),
    readme_en: clipText(readmeEn, 20000),
    og,
  }
  detailCache.set(full, { at: Date.now(), data })
  return data
}

async function registerWithDefineTool(ctx) {
  const { defineTool } = await import('@deepseek-ai/dsh-tools')
  ctx.tools.register(defineTool({
    name: 'dsh_catalog_search',
    description: 'Search the Sakana-yuyu/dsh-plugins catalog of DeepSeek Harness plugins ranked by GitHub stars.',
    parameters: {
      query: { type: 'string', description: 'Search text: plugin name, author, or description' },
      category: { type: 'string', description: 'official, ui, vision, tui, desktop, browser, workflow, tools, search, dev, awesome, other, all' },
      official_only: { type: 'boolean', description: 'If true, only official deepseek-ai plugins' },
      limit: { type: 'number', description: 'Max results, default 8' },
    },
    output: { schema: { type: 'object' } },
    async execute(args) {
      const items = await loadCatalog()
      const found = filterItems(items, args.query, args.category, args.official_only)
      const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 30)
      return { total: found.length, catalog: CATALOG_BASE + '/', results: found.slice(0, limit).map(row) }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'dsh_catalog_install',
    description: 'Install a catalog plugin by running dsh plugin --profile <profile> add github:owner/repo. Confirm full_name with the user first.',
    parameters: {
      full_name: { type: 'string', required: true, description: 'GitHub owner/repo, e.g. liustack/modlens' },
      profile: { type: 'string', description: 'DSH profile name, default web' },
      run: { type: 'boolean', description: 'If true, actually run dsh plugin add. Default true.' },
    },
    output: { schema: { type: 'object' } },
    async execute(args) {
      const full = String(args.full_name || '').trim()
      if (!validFullName(full)) {
        return { ok: false, error: 'full_name must look like owner/repo' }
      }
      const profile = safeProfile(args.profile)
      let previewPath = ''
      try {
        const items = await loadCatalog()
        const hit = items.find(x => x.full_name === full)
        if (hit && hit.path) previewPath = hit.path
      } catch {}
      const cmd = installCmd(full, profile, previewPath)
      const clone = 'git clone https://github.com/' + full + '.git'
      if (args.run === false) {
        return { ok: true, ran: false, command: cmd, clone, path: previewPath || undefined }
      }
      const result = await installPlugin(full, profile, previewPath)
      return {
        ok: result.ok,
        ran: true,
        launched: !!result.launched,
        command: cmd,
        clone,
        needsRestart: result.needsRestart,
        message: result.message,
        stdout: (result.stdout || '').slice(-4000),
        stderr: (result.stderr || '').slice(-4000),
      }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'dsh_catalog_update',
    description: 'Update this catalog plugin (self), all installed github: plugins (all), or one owner/repo by re-adding the git source.',
    parameters: {
      target: { type: 'string', required: true, description: 'self, all, or owner/repo' },
      profile: { type: 'string', description: 'DSH profile name, default web' },
      run: { type: 'boolean', description: 'If true, actually run. Default true.' },
    },
    output: { schema: { type: 'object' } },
    async execute(args) {
      const target = String(args.target || '').trim()
      const fulls = resolveUpdateFulls(target)
      if (!fulls) {
        return { ok: false, error: 'target must be self, all, or owner/repo' }
      }
      const profile = safeProfile(args.profile)
      const command = fulls.map(f => installCmd(f, profile)).join(' && ')
      if (args.run === false) {
        return { ok: true, ran: false, target, command, targets: fulls }
      }
      const result = await runUpdate(target, profile)
      return {
        ok: result.ok,
        ran: true,
        launched: !!result.launched,
        target,
        command,
        targets: result.targets || fulls,
        needsRestart: result.needsRestart,
        message: result.message,
        stdout: (result.stdout || '').slice(-4000),
        stderr: (result.stderr || '').slice(-4000),
      }
    },
  }))
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let n = 0
    req.on('data', (c) => {
      n += c.length
      if (n > 1000000) {
        req.destroy()
        reject(new Error('body too large'))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function handleHttp(req, res) {
  let path = '/'
  let search = ''
  try {
    const u = new URL(req.url || '/', 'http://127.0.0.1')
    path = u.pathname
    search = u.search
  } catch {
    path = '/'
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  const method = (req.method || 'GET').toUpperCase()

  if (method === 'GET' && path === '/api/dsh-plugins/catalog') {
    try {
      const items = await loadCatalog()
      const plugins = items.slice(0, 400).map(apiRow)
      sendJson(res, 200, { ok: true, plugins })
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'GET' && path === '/api/dsh-plugins/detail') {
    let full = ''
    try {
      full = new URL(req.url || ('/' + search), 'http://127.0.0.1').searchParams.get('full_name') || ''
    } catch {
      full = ''
    }
    full = String(full).trim()
    if (!validFullName(full)) {
      sendJson(res, 400, { ok: false, error: 'full_name must look like owner/repo' })
      return
    }
    try {
      const data = await loadDetail(full)
      sendJson(res, 200, data)
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'GET' && path === '/api/dsh-plugins/prefs') {
    try {
      sendJson(res, 200, { ok: true, prefs: loadPrefs() })
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/prefs') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    try {
      const prefs = mergePrefs(body)
      sendJson(res, 200, { ok: true, prefs })
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'GET' && path === '/api/dsh-plugins/updates') {
    try {
      const data = await checkUpdates(true)
      sendJson(res, 200, data)
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/install') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    const full = String((body && body.full_name) || '').trim()
    if (!validFullName(full)) {
      sendJson(res, 400, { ok: false, error: 'full_name must look like owner/repo' })
      return
    }
    const profile = safeProfile(body && body.profile)
    let sub = sanitizePath(body && body.path)
    if (!sub) {
      try {
        const items = await loadCatalog()
        const hit = items.find(x => x.full_name === full)
        if (hit && hit.path) sub = hit.path
      } catch {}
    }
    try {
      const result = await installPlugin(full, profile, sub)
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        needsRestart: true,
        message: String(err && err.message || err),
        command: installCmd(full, profile, sub),
        stdout: '',
        stderr: String(err && err.message || err),
      })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/update') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    const target = String((body && body.target) || '').trim()
    const profile = safeProfile(body && body.profile)
    if (!resolveUpdateFulls(target)) {
      sendJson(res, 400, { ok: false, error: 'target must be self, all, or owner/repo' })
      return
    }
    try {
      const result = await runUpdate(target, profile)
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        needsRestart: true,
        message: String(err && err.message || err),
        target,
      })
    }
    return
  }

  sendJson(res, 404, { ok: false, error: 'not found' })
}

function registerHttp(ctx) {
  if (!ctx.webServer) return
  const route = {
    kind: 'prefix',
    path: '/api/dsh-plugins',
    handler: handleHttp,
  }
  if (ctx.effect) ctx.effect(() => ctx.webServer.register(route))
  else ctx.webServer.register(route)
}

async function scheduledTick(ctx) {
  try {
    const info = await checkUpdates(true)
    const prefs = loadPrefs()
    const newer = !!(info.self && info.self.newer)
    if (!newer) return
    if (prefs.autoUpdateOthers) {
      const result = await runUpdate('all', 'web')
      if (result && result.ok && info.self && info.self.latestSha) {
        prefs.lastSelfSha = info.self.latestSha
        savePrefs(prefs)
      }
    } else if (prefs.autoUpdateSelf) {
      const result = await runUpdate('self', 'web')
      if (result && result.ok && info.self && info.self.latestSha) {
        prefs.lastSelfSha = info.self.latestSha
        savePrefs(prefs)
      }
    }
  } catch (err) {
    if (ctx && ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] check ' + err)
  }
}

export {
  sanitizePath,
  githubSpec,
  parseGithubSpec,
  toUpdateSpec,
  isPlaceholderPkg,
  expand,
  installCmd,
  applyPathOverride,
  PLACEHOLDER_WARN,
}

export async function apply(ctx) {
  try {
    await registerWithDefineTool(ctx)
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] ' + err)
  }
  try {
    registerHttp(ctx)
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] http ' + err)
  }
  try {
    const inst = collectInstalledGithub()
    for (const x of inst) {
      if (x.placeholder && ctx.logger && ctx.logger.warn) {
        ctx.logger.warn('[dsh-plugins-catalog] ' + x.full_name + ': ' + x.warning)
      }
    }
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] installed ' + err)
  }
  try {
    const prefs = loadPrefs()
    if (prefs.autoUpdateSelf || prefs.autoUpdateOthers) {
      setTimeout(() => {
        scheduledTick(ctx)
        setInterval(() => scheduledTick(ctx), 6 * 60 * 60 * 1000)
      }, 20000)
    }
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] autoupdate ' + err)
  }
}
