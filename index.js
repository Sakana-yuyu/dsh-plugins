export const name = 'dsh-plugins-catalog'
export const inject = ['tools']

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

export async function apply(ctx) {
  try {
    await registerWithDefineTool(ctx)
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] ' + err)
  }
}
