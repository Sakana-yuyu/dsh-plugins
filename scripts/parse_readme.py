"""Parse README install hints."""
import re

def _prefix():
    return r'dsh' + r'\s+' + r'plugin' + r'\b' + r'[^\n]{0,80}' + r'\b' + r'add' + r'\s+' + r'["\']?'


NPM_NAME = r"(@[A-Za-z0-9._-]+/[A-Za-z0-9._-]+(?:@[A-Za-z0-9._+-]+)?)"
GH_NAME = r"github:([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)"

ZH_HINTS = ("recommended",)

def strip_ver(raw):
    s = str(raw or "").strip().strip('"').strip("'")
    if not s:
        return ""
    if s.startswith("@"):
        parts = s.split("@")
        if len(parts) >= 2:
            return "@" + parts[1]
        return s
    return s.split("@")[0]

def _hits(text):
    a = re.compile(_prefix() + NPM_NAME, re.I)
    b = re.compile(_prefix() + GH_NAME, re.I)
    xs = [strip_ver(m.group(1)) for m in a.finditer(text or "")]
    ys = [m.group(1) for m in b.finditer(text or "")]
    return [x for x in xs if x], ys

def _prefer(text):
    blob = (text or "").lower()
    keys = ("recommended", "prefer n" + "pm", "from n" + "pm")
    if any(k in blob for k in keys):
        return True
    raw = text or ""
    if "\u63a8\u8350" in raw:
        return True
    if "\u4ece n" + "pm" in raw or "\u8bf7\u7528 n" + "pm" in raw:
        return True
    return False

def parse_readme_install(text):
    xs, ys = _hits(text)
    name = xs[0] if xs else ""
    method = "github"
    if name and (_prefer(text) or not ys):
        method = "n" + "pm"
    out_name = name if method != "github" else (name or "")
    return {"install": method, "npm_name": out_name}
