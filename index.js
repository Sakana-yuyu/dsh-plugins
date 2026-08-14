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

async function spawnDshAdd(full, profile) {
  const { spawn } = await import('node:child_process')
  return new Promise((resolve) => {
    const child = spawn('dsh', ['plugin', '--profile', profile, 'add', 'github:' + full], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (err) => resolve({ code: 127, stdout, stderr: String(err) }))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
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
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full)) {
        return { ok: false, error: 'full_name must look like owner/repo' }
      }
      const profile = String(args.profile || 'web').replace(/[^A-Za-z0-9_-]/g, '') || 'web'
      const cmd = installCmd(full, profile)
      const clone = 'git clone https://github.com/' + full + '.git'
      if (args.run === false) {
        return { ok: true, ran: false, command: cmd, clone }
      }
      const { spawn } = await import('node:child_process')
      const result = await new Promise((resolve) => {
        const child = spawn('dsh', ['plugin', '--profile', profile, 'add', 'github:' + full], { stdio: ['ignore', 'pipe', 'pipe'] })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', (d) => { stdout += d })
        child.stderr.on('data', (d) => { stderr += d })
        child.on('error', (err) => resolve({ code: 127, stdout, stderr: String(err) }))
        child.on('close', (code) => resolve({ code, stdout, stderr }))
      })
      return {
        ok: result.code === 0,
        ran: true,
        command: cmd,
        clone,
        exit_code: result.code,
        stdout: (result.stdout || '').slice(-4000),
        stderr: (result.stderr || '').slice(-4000),
      }
    },
  }))
}

async function installPlugin(full, profile) {
  const command = installCmd(full, profile)
  const result = await spawnDshAdd(full, profile)
  let stdout = result.stdout || ''
  let stderr = result.stderr || ''
  let ok = result.code === 0
  if (!ok) {
    const cp = await import("node:child_process")
    const os = await import("node:os")
    const path = await import("node:path")
    const home = process.env.DSH_HOME || path.join(os.homedir(), ".dsh")
    const cwd = path.join(home, "profiles", profile)
    const extra = cp.spawnSync("pnpm", ["add", "github:" + full], { cwd: cwd, encoding: "utf8", timeout: 180000 })
    stdout += extra.stdout || ""
    stderr += (extra.stderr || "") + (extra.error ? String(extra.error) : "")
    ok = extra.status === 0
  }
  return {
    ok,
    needsRestart: true,
    message: ok ? 'installed' : ((stderr || '').slice(-500) || 'install failed'),
    command,
    stdout: stdout.slice(-4000),
    stderr: stderr.slice(-4000),
  }
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
  try {
    path = new URL(req.url || '/', 'http://127.0.0.1').pathname
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
