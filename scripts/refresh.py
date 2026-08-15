#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path
from radar_merge import is_index_repo
ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
API = "https://api.github.com/search/repositories"
QUERY = "topic:dsh-plugin"
PER_PAGE = 100
MAX_PAGES = 10

OFFICIAL_GROUPS = [
    ("core", "产品 API 主干：会话、提示词、工具、agent 服务与循环", "Product API spine: session, prompt, tools, agent services and loop"),
    ("api", "Remote BFF 装配与 Typert RPC 网关", "Remote BFF assembly and Typert RPC gateway"),
    ("typert", "类型图生成、产物加载与运行时注册表", "Type-graph generation, artifact loading, runtime registry"),
    ("goal", "同会话 goal 的持久化与生命周期", "In-session goal persistence and lifecycle"),
    ("schedule", "仅限会话内的定时后续操作", "In-session scheduled follow-ups"),
    ("feedback", "人类反馈", "Human feedback"),
    ("identity", "共享匿名身份", "Shared anonymous identity"),
    ("llm", "LLM 能力系列：抽象服务 + 提供方适配器", "LLM capability family: abstract service + provider adapters"),
    ("e2b", "E2B 提供方", "E2B provider"),
    ("subprocess", "子进程能力系列", "Subprocess capability family"),
    ("shell", "Bash 能力系列：执行器、本地实现、面向模型的工具", "Bash capability family: executor, local impl, model-facing tools"),
    ("terminal", "持久 PTY 能力系列", "Persistent PTY capability family"),
    ("code-runtime", "代码执行能力系列", "Code-execution capability family"),
    ("sandbox", "进程限制 seam；bwrap/Landlock/Seatbelt 后端", "Process-limit seam; bwrap/Landlock/Seatbelt backends"),
    ("fs", "文件系统能力系列", "Filesystem capability family"),
    ("lsp", "LSP 能力系列", "LSP capability family"),
]

OFFICIAL_GROUPS += [
    ("skill", "skill 能力系列：提供方注册表与目录", "Skill capability family: provider registry and catalog"),
    ("compaction", "压缩（compaction）能力系列", "Compaction capability family"),
    ("context", "模型可见请求上下文", "Model-visible request context"),
    ("subagent", "subagent 能力系列与委托工具", "Subagent capability family and delegation tools"),
    ("jobs", "通用后台任务运行时", "Generic background job runtime"),
    ("workflow", "工作流 seam 与面向模型的 workflow/ralph 工具", "Workflow seam and model-facing workflow/ralph tools"),
    ("web", "Web 能力系列：搜索／获取与面向模型的 Web 工具", "Web capability family: search/fetch and model-facing web tools"),
    ("attachment", "持久附件标识与本地内容寻址存储", "Persistent attachments and content-addressed storage"),
    ("spill", "spill 能力系列：存储 seam 与工具结果溢出", "Spill capability family: storage seam and tool-result overflow"),
    ("todo", "面向模型的 todo_write 工具", "Model-facing todo_write tool"),
    ("plan", "Plan 协作状态", "Plan collaboration state"),
    ("preset", "由 preset cordis.yml 按会话组装 agent", "Assemble agents per session from preset cordis.yml"),
    ("guard", "循环卫生守卫", "Loop hygiene guards"),
    ("bundle", "可安装的 dsh --profile 补丁层", "Installable dsh --profile patch layers"),
    ("extensions", "agent 运行时自修改：插件挂载／卸载", "Agent runtime self-modification: mount/unmount plugins"),
    ("hooks", "钩子桥接 + Claude Code／Codex 线协议", "Hook bridge + Claude Code/Codex wire protocol"),
]

OFFICIAL_GROUPS += [
    ("session", "持久会话数据平面", "Persistent session data plane"),
    ("session-query", "会话检索：血缘、语义过滤、全文搜索", "Session retrieval: lineage, semantic filter, full-text search"),
    ("settings", "用户设置 seam + 基于文件的提供方", "User settings seam + file-based provider"),
    ("credentials", "凭据引用 seam + 环境变量／.env 提供方", "Credential-ref seam + env/.env provider"),
    ("storage", "非会话存储中枢", "Non-session storage hub"),
    ("workspace", "Workspace 实体", "Workspace entity"),
    ("sdk", "进程外运行时 SDK", "Out-of-process runtime SDK"),
    ("acp", "面向自动化的 ACP 服务器", "Automation-facing ACP server"),
    ("interaction", "人机协作平面：批准、权限、询问用户", "Human collaboration: approvals, permissions, ask-user"),
    ("boot", "共享的 app bin 启动粘合层", "Shared app-bin boot glue"),
    ("host", "web GUI 宿主半侧：API 网关 + HTTP 路由", "Web GUI host half: API gateway + HTTP router"),
    ("client", "web GUI 浏览器半侧", "Web GUI browser half"),
    ("examples", "演示组合包", "Demo composition packages"),
    ("test-support", "测试支持基础设施", "Test-support infrastructure"),
    ("util", "组间共享的低层零依赖工具", "Shared low-level zero-dep utilities"),
]
OFFICIAL_BUNDLES = [
    ("base", "packages/bundle/base", "每个 profile 最先叠加的共享核心层", "Shared core layer every profile applies first"),
    ("web-app", "packages/bundle/web-app", "浏览器界面：web 补丁层 + 运行时粘合插件", "Browser surface: web patch layer + runtime glue"),
    ("headless", "packages/bundle/headless", "基于 base 的一次性任务模式，无 Host / Web 层", "One-shot task mode over base, no Host or Web layer"),
]
CATEGORIES = [
    ("official", "官方核心", "Official core"),
    ("ui", "UI 与皮肤", "UI & skins"),
    ("vision", "视觉", "Vision"),
    ("tui", "终端 TUI", "Terminal TUI"),
    ("desktop", "桌面客户端", "Desktop"),
    ("browser", "浏览器", "Browser"),
    ("workflow", "工作流与多智能体", "Workflow & agents"),
    ("tools", "工具与技能", "Tools & skills"),
    ("search", "搜索与研究", "Search & research"),
    ("dev", "开发与代码", "Dev & code"),
    ("awesome", "目录与精选", "Awesome lists"),
    ("other", "其他", "Other"),
]
CAT_MAP = {cid: (zh, en) for cid, zh, en in CATEGORIES}

def load_translations():
    p = DOCS / "i18n-overrides.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {}

def load_paths():
    p = DOCS / "path-overrides.json"
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    return {}

def load_install_overrides():
    p = DOCS / "install-overrides.json"
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    return {}


def fetch_readme_text(full, token, branch="HEAD"):
    if not full:
        return ""
    url = "https://raw.githubusercontent.com/" + full + "/" + branch + "/README.md"
    headers = {"User-Agent": "dsh-plugins-catalog"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception:
        return ""


def _load_parser():
    try:
        from parse_readme import parse_readme_install
        return parse_readme_install
    except ImportError:
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from parse_readme import parse_readme_install
        return parse_readme_install

def classify(item):
    owner = (item.get("full_name") or "").split("/")[0].lower()
    if owner == "deepseek-ai":
        return "official"
    blob = " ".join([
        item.get("name") or "",
        item.get("full_name") or "",
        item.get("description") or "",
        " ".join(item.get("topics") or []),
    ]).lower()
    rules = [
        ("awesome", ("awesome", "精选", "catalog", "目录", "handbook", "find-plugins", "awesome-list", "curated")),
        ("vision", ("vision", "视觉", "ocr", "multimodal", "看图", "image-to-text", "modlens")),
        ("tui", ("tui", "terminal-ui", "ink", "终端", "tty", "cli-ui")),
        ("browser", ("browser", "chrome-extension", "浏览器", "chrome sidebar", "dsh-browser")),
        ("desktop", ("desktop", "tauri", "electron", "macos", "launcher", "webview2", "桌面")),
        ("ui", ("skin", "皮肤", "theme", "主题", "web-ui", "web ui", "sidebar", "侧栏", "pet", "宠物", "genui", "visualize", "whale", "鲸鱼", "ads", "广告")),
        ("search", ("search", "搜索", "research", "paper", "论文", "modsearch", "arxiv")),
        ("workflow", ("workflow", "multi-agent", "多智能体", "agent-teams", "orchestration", "subagent", "cowork")),
        ("dev", ("vscode", "lsp", "coding-agent", "decompiler", "reverse", "profiler", "git graph", "sandbox")),
        ("tools", ("skill", "mcp", "memory", "notification", "技能", "toolkit", "todo", "hook")),
    ]
    for cid, keys in rules:
        if any(k in blob for k in keys):
            return cid
    return "other"

def is_bilingual(text):
    if not text:
        return False
    has_cjk = any("\u4e00" <= ch <= "\u9fff" for ch in text)
    has_latin = any("a" <= ch.lower() <= "z" for ch in text)
    return has_cjk and has_latin and len(text) >= 24

def descriptions(full_name, raw, translations):
    raw = (raw or "").strip()
    ov = translations.get(full_name)
    if ov:
        return ov.get("zh", raw), ov.get("en", raw)
    if is_bilingual(raw):
        return raw, raw
    return raw, raw

def github_get(url, token):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "dsh-plugins-catalog",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_err = None
    for attempt in range(4):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            if e.code in (403, 429):
                reset = e.headers.get("X-RateLimit-Reset")
                wait = 70
                if reset:
                    try:
                        wait = max(8, int(reset) - int(time.time()) + 2)
                    except ValueError:
                        pass
                print(f"rate limited ({e.code}), sleeping {wait}s", file=sys.stderr)
                time.sleep(min(wait, 95))
                continue
            print(body, file=sys.stderr)
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last_err = e
            wait = 2 * (attempt + 1)
            print(f"github GET retry {attempt + 1}/4 after {e}; sleep {wait}s", file=sys.stderr)
            time.sleep(wait)
    if last_err:
        raise last_err
    raise RuntimeError("github GET failed")

def fetch_all(token):
    items, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        qs = urllib.parse.urlencode({
            "q": QUERY, "sort": "stars", "order": "desc",
            "per_page": PER_PAGE, "page": page,
        })
        url = f"{API}?{qs}"
        print(f"fetch page {page} ...", file=sys.stderr)
        data = github_get(url, token)
        batch = data.get("items") or []
        if not batch:
            print(f"empty page {page}, stop", file=sys.stderr)
            break
        for it in batch:
            key = it.get("full_name")
            if not key or key in seen:
                continue
            seen.add(key)
            items.append(it)
        print(f"  got {len(batch)} (total {len(items)} / {data.get("total_count")})", file=sys.stderr)
        if len(batch) < PER_PAGE:
            break
        time.sleep(0.35 if token else 2.0)
    return items

def to_plugin(it, rank, translations, paths=None):
    full = it.get("full_name") or ""
    official = full.startswith("deepseek-ai/")
    cat = classify(it)
    zh, en = CAT_MAP[cat]
    desc = it.get("description")
    dz, de = descriptions(full, desc, translations)
    clone = it.get("clone_url") or (f"https://github.com/{full}.git" if full else "")
    rec = {
        "rank": rank,
        "name": it.get("name") or "",
        "full_name": full,
        "html_url": it.get("html_url") or f"https://github.com/{full}",
        "description": desc or "",
        "description_zh": dz,
        "description_en": de,
        "stars": int(it.get("stargazers_count") or 0),
        "forks": int(it.get("forks_count") or 0),
        "language": it.get("language") or "",
        "official": official,
        "category": cat,
        "category_zh": zh,
        "category_en": en,
        "clone_url": clone,
        "image": f"https://opengraph.githubassets.com/1/{full}" if full else "",
        "topics": it.get("topics") or [],
        "updated_at": it.get("updated_at") or "",
        "default_branch": it.get("default_branch") or "main",
    }
    if is_index_repo(rec):
        rec["install"] = "link"
    if paths:
        sub = str(paths.get(full) or "").strip().strip("/")
        if sub and ".." not in sub:
            rec["path"] = sub
    return rec

def main():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    DOCS.mkdir(parents=True, exist_ok=True)
    translations = load_translations()
    paths = load_paths()
    raw = fetch_all(token)
    try:
        from radar_merge import fetch_radar_items, merge_github_items
        radar = fetch_radar_items(token)
        print("radar", len(radar), file=sys.stderr)
        raw = merge_github_items(raw, radar)
    except Exception as err:
        print("radar fetch failed:", err, file=sys.stderr)
    plugins = [to_plugin(it, i + 1, translations, paths) for i, it in enumerate(raw)]
    from radar_merge import probe_installable_rows
    plugins = probe_installable_rows(plugins)
    (DOCS / "catalog.json").write_text(json.dumps(plugins, ensure_ascii=False, indent=2) + chr(10), encoding="utf-8")
    print("wrote", len(plugins), "plugins")
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from apply_install import main as apply_main
    apply_main()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
