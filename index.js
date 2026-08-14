export const name = 'dsh-plugins-catalog'
export const inject = ['tools', 'webServer']

const CATALOG_BASE = 'https://sakana-yuyu.github.io/dsh-plugins'
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

function expand(p) {
  if (p && p.full_name && p.name && p.category) return p
  const cat = (p && (p.c || p.category)) || 'other'
  const labels = CATS[cat] || CATS.other
  const full = (p && (p.f || p.full_name)) || ''
  return {
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
}

function installCmd(fullName, profile) {
  return 'dsh plugin --profile ' + (profile || 'web') + ' add "github:' + fullName + '"'
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
  return {
    rank: p.rank,
    name: p.name,
    full_name: p.full_name,
    stars: p.stars,
    official: p.official,
    category: p.category_zh || p.category,
    install: installCmd(p.full_name, 'web'),
    clone: p.clone_url,
    url: p.html_url,
    description: p.description_zh || p.description || p.description_en,
  }
}

function apiRow(p) {
  const r = row(p)
  const full = r.full_name || ''
  const slash = full.indexOf('/')
  return {
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
    url: r.url,
  }
}

function validFullName(full) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full)
}

function safeProfile(value) {
  return String(value || 'web').replace(/[^A-Za-z0-9_-]/g, '') || 'web'
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

function buildPsScript(full, profile) {
  const p = profile
  const f = full
  return [
    "if (-not $env:DSH_HOME) {",
    "  $desk = Join-Path $env:USERPROFILE 'DeepSeek Harness\\dsh-home';",
    "  $dot = Join-Path $env:USERPROFILE '.dsh';",
    "  if (Test-Path -LiteralPath $desk) { $env:DSH_HOME = $desk }",
    "  elseif (Test-Path -LiteralPath $dot) { $env:DSH_HOME = $dot }",
    "}",
    "Write-Host ('DSH_HOME=' + $env:DSH_HOME)",
    "if (Get-Command dsh -ErrorAction SilentlyContinue) {",
    "  dsh plugin --profile " + p + " add \"github:" + f + "\"",
    "} elseif (Get-Command npx -ErrorAction SilentlyContinue) {",
    "  npx --yes @deepseek-ai/dsh plugin --profile " + p + " add \"github:" + f + "\"",
    "} else {",
    "  Write-Host '找不到 dsh 或 npx，请先安装 Node.js 或把 dsh 加到 PATH'",
    "}",
    "Write-Host '完成。请重启 DSH / dsh-desktop。'",
  ].join('; ')
}

async function launchVisiblePowerShell(script) {
  const { spawn, spawnSync, existsSync } = await loadNodeMods()
  const shell = findPowerShellHost(spawnSync, existsSync) || 'powershell.exe'
  return new Promise((resolve, reject) => {
    let child
    if (process.platform === 'win32') {
      child = spawn('cmd.exe', ['/c', 'start', '安装插件', shell, '-NoExit', '-Command', script], {
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

async function installViaNpxOrDsh(full, profile) {
  const npxArgs = ['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', profile, 'add', 'github:' + full]
  let result = await spawnNamed('npx', npxArgs)
  if (result.code !== 0) {
    const dsh = await spawnNamed('dsh', ['plugin', '--profile', profile, 'add', 'github:' + full])
    result = {
      code: dsh.code,
      stdout: (result.stdout || '') + (dsh.stdout || ''),
      stderr: (result.stderr || '') + (dsh.stderr || ''),
    }
  }
  return result
}

async function installPlugin(full, profile) {
  const command = installCmd(full, profile)
  const { spawnSync, existsSync } = await loadNodeMods()
  const useWin = process.platform === 'win32' || !!findPowerShellHost(spawnSync, existsSync)
  if (useWin) {
    const script = buildPsScript(full, profile)
    try {
      await launchVisiblePowerShell(script)
      return {
        ok: true,
        launched: true,
        needsRestart: true,
        message: '已打开 PowerShell 安装窗口，完成后请重启 DSH',
        command,
      }
    } catch (err) {
      return {
        ok: false,
        launched: false,
        needsRestart: true,
        message: String(err && err.message || err),
        command,
        stdout: '',
        stderr: String(err && err.message || err),
      }
    }
  }
  const result = await installViaNpxOrDsh(full, profile)
  const stdout = result.stdout || ''
  const stderr = result.stderr || ''
  const ok = result.code === 0
  return {
    ok,
    launched: false,
    needsRestart: true,
    message: ok ? 'installed' : ((stderr || '').slice(-500) || 'install failed'),
    command,
    stdout: stdout.slice(-4000),
    stderr: stderr.slice(-4000),
  }
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
      const cmd = installCmd(full, profile)
      const clone = 'git clone https://github.com/' + full + '.git'
      if (args.run === false) {
        return { ok: true, ran: false, command: cmd, clone }
      }
      const result = await installPlugin(full, profile)
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
    try {
      const result = await installPlugin(full, profile)
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        needsRestart: true,
        message: String(err && err.message || err),
        command: installCmd(full, profile),
        stdout: '',
        stderr: String(err && err.message || err),
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
}
