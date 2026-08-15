window.__ModuleLoader__.load({
  id: "dsh-plugins-catalog",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useCallback = React.useCallback;
    var useRef = React.useRef;
    var ReactDOM = null;
    try { ReactDOM = require("react-dom"); } catch (e) { ReactDOM = null; }
    var createPortal = ReactDOM && (ReactDOM.createPortal || (ReactDOM.default && ReactDOM.default.createPortal));

    var CATS = [
      { id: "all", zh: "全部分类" },
      { id: "official", zh: "官方核心" },
      { id: "ui", zh: "UI 与皮肤" },
      { id: "vision", zh: "视觉" },
      { id: "tui", zh: "终端 TUI" },
      { id: "desktop", zh: "桌面" },
      { id: "browser", zh: "浏览器" },
      { id: "workflow", zh: "工作流" },
      { id: "tools", zh: "工具" },
      { id: "search", zh: "搜索" },
      { id: "dev", zh: "开发" },
      { id: "awesome", zh: "精选" },
      { id: "other", zh: "其他" }
    ];
    var SCOPES = [
      { id: "all", zh: "全部" },
      { id: "official", zh: "官方" },
      { id: "community", zh: "社区" }
    ];
    var BRAND = "#2563eb";
    var FG = "#111827";
    var MUTED = "#6b7280";
    var LINE = "#e5e7eb";
    var BG = "#ffffff";
    var ERR = "#dc2626";
    var OK = "#16a34a";
    var LS_KEY = "dsh-plugins-ui";
    var EVT = "dsh-plugins-ui";
    var UPD_EVT = "dsh-plugins-update";
    var RESTART_LS = "dsh-plugins-restart";
    var SELF_FULL = "Sakana-yuyu/dsh-plugins";
    var SITE = "https://sakana-yuyu.github.io/dsh-plugins/";

    // Shared open-state for the full-screen plugin store panel. The sidebar
    // "插件" button toggles it; the shell.overlay occupant renders the panel
    // while open. The panel is fully self-contained (does not depend on
    // activating a conversation.view tab, which the desktop shell would not
    // reliably switch to from a sidebar action).
    var storeOpen = false;
    var storeListeners = [];
    function setStoreOpen(v) {
      v = !!v;
      if (v === storeOpen) return;
      storeOpen = v;
      for (var k = 0; k < storeListeners.length; k++) {
        try { storeListeners[k](v); } catch (e) {}
      }
    }
    function subscribeStoreOpen(fn) {
      storeListeners.push(fn);
      return function () {
        var i = storeListeners.indexOf(fn);
        if (i >= 0) storeListeners.splice(i, 1);
      };
    }

    // Error boundary: if the catalog UI throws during render, show the error
    // instead of letting the slot abdicate (which blanks the view silently).
    var CatalogErrorBoundary = (function () {
      function CB(props) {
        React.Component.call(this, props);
        this.state = { err: null };
      }
      CB.prototype = Object.create(React.Component.prototype);
      CB.prototype.constructor = CB;
      CB.prototype.componentDidCatch = function (err) {
        this.setState({ err: String((err && err.message) || err) });
      };
      CB.prototype.render = function () {
        if (this.state.err) {
          return h("div", {
            style: { color: "#dc2626", padding: 16, fontSize: 13, lineHeight: "20px" }
          }, "插件库渲染出错：" + this.state.err);
        }
        return this.props.children;
      };
      return CB;
    })();

    function PluginIcon() {
      return h("svg", {
        width: 18,
        height: 18,
        viewBox: "0 0 20 20",
        fill: "none",
        "aria-hidden": "true",
        style: { flexShrink: 0, display: "block" }
      },
        h("circle", { cx: 10, cy: 10, r: 8.2, stroke: "currentColor", strokeWidth: 1.5 }),
        h("path", {
          d: "M10 4.8c1.7 2.1 2.8 3.4 2.8 5.4A2.8 2.8 0 0 1 10 13a2.8 2.8 0 0 1-2.8-2.8c0-2 1.1-3.3 2.8-5.4z",
          fill: "currentColor"
        })
      );
    }

    function publishUpdate(info) {
      try { window.dispatchEvent(new CustomEvent(UPD_EVT, { detail: info || {} })); } catch (e) {}
    }
    function fetchUpdateInfo(cb) {
      fetch("/api/dsh-plugins/updates")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var self = (data && data.self) || {};
          var info = {
            ok: !!(data && data.ok),
            newer: !!(self.newer),
            current: self.current || "",
            latest: self.latest || "",
            latestSha: self.latestSha || "",
            status: self.status || "",
            newerCount: (data && data.newerCount) || 0,
            installed: (data && data.installed) || []
          };
          publishUpdate(info);
          if (cb) cb(null, info, data);
        })
        .catch(function (e) { if (cb) cb(e); });
    }
    function runUpdate(target, cb) {
      fetch("/api/dsh-plugins/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: target || "self" })
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
        .then(function (data) { if (cb) cb(null, data); })
        .catch(function (e) { if (cb) cb(e); });
    }
    function restartNow() {
      fetch("/api/dsh-plugins/restart", { method: "POST" }).catch(function () {});
      var inv = window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke;
      if (typeof inv === "function") {
        inv("plugin:process|restart").catch(function () { return inv("plugin:process|exit", { code: 0 }); });
      }
      setTimeout(function () { location.reload(); }, 1200);
    }
    function readRestartNeeded() {
      try { return localStorage.getItem(RESTART_LS) === "1"; } catch (e) { return false; }
    }
    function writeRestartNeeded(on) {
      try {
        if (on) localStorage.setItem(RESTART_LS, "1");
        else localStorage.removeItem(RESTART_LS);
      } catch (e) {}
    }
    function fetchInstalled(cb) {
      fetch("/api/dsh-plugins/installed?check=1")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.installed)) {
            if (cb) cb(null, data.installed, data);
            return;
          }
          fetch("/api/dsh-plugins/updates")
            .then(function (r2) { return r2.json(); })
            .then(function (d2) { if (cb) cb(null, (d2 && d2.installed) || [], d2); })
            .catch(function (e) { if (cb) cb(e, []); });
        })
        .catch(function () {
          fetch("/api/dsh-plugins/updates")
            .then(function (r2) { return r2.json(); })
            .then(function (d2) { if (cb) cb(null, (d2 && d2.installed) || [], d2); })
            .catch(function (e) { if (cb) cb(e, []); });
        });
    }
    function attachUpdateFields(c, row) {
      if (!c || !row) return c;
      c.newer = !!row.newer;
      c.current = row.current || row.version || "";
      c.latest = row.latest || "";
      c.currentSha = row.currentSha || "";
      c.latestSha = row.latestSha || "";
      c.status = row.status || "";
      c.version = row.version || c.current || "";
      return c;
    }
    function itemKey(row) {
      if (!row) return "";
      return row.name || row.npm_name || row.full_name || row.spec || "";
    }
    function cardFromInstalled(row) {

      if (row && row.catalog) {
        var c = {};
        for (var k in row.catalog) c[k] = row.catalog[k];
        c.installed = true;
        if (row.warning) c.warning = row.warning;
        if (row.issues_url) c.issues_url = row.issues_url;
        if (row.usable === false) c.usable = false;
        if (row.self) c.self = true;
        return attachUpdateFields(c, row);
      }
      var full = (row && row.full_name) || "";
      var pkgName = (row && row.name) || "";
      var slash = full.indexOf("/");
      return attachUpdateFields({
        name: pkgName || full,
        full_name: full,
        npm_name: (row && row.npm_name) || "",
        install_method: (row && row.install_method) || (row && row.source) || "",
        source: (row && row.source) || "",
        removable: row && row.removable !== false,
        description: (row && row.spec) || "",
        install: "",
        author: slash > 0 ? full.slice(0, slash) : "",
        warning: (row && row.warning) || "",
        issues_url: (row && row.issues_url) || (full ? ("https://github.com/" + full + "/issues") : ""),
        usable: row ? row.usable !== false : true,
        self: !!(row && row.self)
      }, row);
    }

    function Pager(props) {
      var cur = props.cur;
      var pages = props.pages;
      var setPage = props.setPage;
      var jp = useState(String(cur));
      var jump = jp[0], setJump = jp[1];
      useEffect(function () { setJump(String(cur)); }, [cur]);
      function go(n) {
        n = parseInt(n, 10);
        if (!(n > 0)) n = 1;
        if (n > pages) n = pages;
        setPage(n);
      }
      return h("div", {
        style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }
      },
        h("button", {
          type: "button",
          disabled: cur <= 1,
          onClick: function () { go(1); },
          style: btnStyle(cur <= 1, false)
        }, "首页"),
        h("button", {
          type: "button",
          disabled: cur <= 1,
          onClick: function () { go(cur - 1); },
          style: btnStyle(cur <= 1, false)
        }, "上一页"),
        h("form", {
          onSubmit: function (e) { if (e && e.preventDefault) e.preventDefault(); go(jump); },
          style: { display: "flex", alignItems: "center", gap: 6 }
        },
          h("input", {
            value: jump,
            onChange: function (e) { setJump(e.target.value); },
            inputMode: "numeric",
            title: "输入页码后回车或点跳转",
            style: {
              width: 52,
              padding: "4px 6px",
              borderRadius: 6,
              border: "1px solid " + LINE,
              background: BG,
              color: FG,
              textAlign: "center",
              fontSize: 12,
              outline: "none"
            }
          }),
          h("span", { style: { color: MUTED, fontSize: 12 } }, "/ " + pages),
          h("button", { type: "submit", style: btnStyle(false, true) }, "跳转")
        ),
        h("button", {
          type: "button",
          disabled: cur >= pages,
          onClick: function () { go(cur + 1); },
          style: btnStyle(cur >= pages, false)
        }, "下一页"),
        h("button", {
          type: "button",
          disabled: cur >= pages,
          onClick: function () { go(pages); },
          style: btnStyle(cur >= pages, false)
        }, "末页")
      );
    }

    function UpdateBanner(props) {
      var info = props.info;
      var busy = props.busy;
      var onUpdate = props.onUpdate;
      var note = props.note;
      if (note) {
        return h("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid " + (note.ok ? OK : ERR),
            color: note.ok ? OK : ERR,
            background: BG,
            fontWeight: 600
          }
        }, note.text);
      }
      if (info && (info.status === "error" || info.ok === false)) {
        return h("div", {
          onClick: props.onRetry,
          style: {
            padding: "8px 12px",
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid " + LINE,
            background: BG,
            color: MUTED,
            fontSize: 12,
            cursor: props.onRetry ? "pointer" : "default"
          }
        }, "检查失败，点此重试");
      }
      var names = [];
      var inst = (info && info.installed) || [];
      for (var ui = 0; ui < inst.length; ui++) {
        if (inst[ui] && inst[ui].newer) names.push(inst[ui].name || inst[ui].full_name);
      }
      if (!names.length && info && info.newer) names.push("dsh-plugins-catalog");
      if (!info || (!info.newer && !(info.newerCount > 0) && !names.length)) return null;
      return h("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          marginBottom: 12,
          borderRadius: 8,
          border: "1px solid " + BRAND,
          background: BG
        }
      },
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontWeight: 650, color: BRAND } }, names.length ? ("有更新：" + names.join("、")) : "目录插件有新版本"),
          h("div", { style: { fontSize: 12, color: MUTED, marginTop: 2 } },
            names.length
              ? ("共 " + names.length + " 个。对应卡片会标「有更新」，点那张卡的「更新」。")
              : ("当前 " + (info.current || "-") + " → " + (info.latest || info.latestSha || "最新"))
          )
        ),
        h("button", {
          type: "button",
          disabled: !!busy,
          onClick: onUpdate,
          style: btnStyle(!!busy, true)
        }, busy ? "更新中…" : "立即更新")
      );
    }

    function RestartBanner(props) {
      if (!props.show) return null;
      return h("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 14px",
          marginBottom: 12,
          borderRadius: 8,
          border: "1px solid " + BRAND,
          background: BG
        }
      },
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontWeight: 700, color: BRAND, fontSize: 14 } }, "需要重启"),
          h("div", { style: { fontSize: 12, color: FG, marginTop: 4, lineHeight: "18px" } },
            "请完全退出 dsh-desktop 再打开，刚安装或卸载的插件才会生效。"
          )
        ),
        h("button", {
          type: "button",
          onClick: props.onDismiss,
          style: btnStyle(false, true)
        }, "知道了")
      );
    }

    function RestartModal(props) {
      if (!props.show) return null;
      var node = h("div", {
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 10001,
          background: "rgba(0,0,0,0.48)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box"
        }
      },
        h("div", {
          onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); },
          style: {
            width: "min(420px, 92vw)",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "18px 20px 20px",
            boxSizing: "border-box",
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)"
          }
        },
          h("div", { style: { fontSize: 18, fontWeight: 650, color: "#111827", marginBottom: 10 } }, "更新完成"),
          h("div", { style: { fontSize: 13, lineHeight: "22px", color: "#374151", marginBottom: 16 } },
            "插件已更新。要现在重启应用吗？不重启的话，新版本要等下次启动才生效。"
          ),
          h("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            h("button", { type: "button", onClick: props.onLater, style: {
              padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db",
              background: "#fff", color: "#111827", fontWeight: 600, cursor: "pointer"
            } }, "稍后"),
            h("button", { type: "button", onClick: props.onRestart, style: {
              padding: "8px 14px", borderRadius: 8, border: "1px solid #2563eb",
              background: "#2563eb", color: "#ffffff", fontWeight: 650, cursor: "pointer"
            } }, "立即重启")
          )
        )
      );
      return overlay(node);
    }

    // Two-column card grid. Injected once at apply time so both the overlay
    // store page and the conversation.view tab get the layout.
    function injectGridCss() {
      if (typeof document === "undefined") return;
      var id = "dsh-plugins-grid-css";
      if (document.getElementById(id)) return;
      var style = document.createElement("style");
      style.id = id;
      style.textContent = [
        // Equal-size card grid: auto-fill creates as many 300px columns as the
        // container width allows and every column shares the remaining width
        // equally, so ALL cards are the same size (no stretched last row).
        // Maximizing the window adds columns instead of widening cards.
        '[data-dsh-plugins-catalog]{width:100%;max-width:none;flex:1 1 auto;min-width:0;align-self:stretch;box-sizing:border-box}',
        '[data-dsh-plugins-grid]{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:stretch}',
        '[data-dsh-plugins-grid]>*{min-width:0}',
        '.dsh-plugins-sidebar-btn:hover{background:rgba(0,0,0,0.06)}',
        '.dsh-plugins-sidebar-btn:active{background:rgba(0,0,0,0.1)}'
      ].join("");
      document.head.appendChild(style);
    }

    function hideStoreChrome() {
      if (typeof document === "undefined") return function () {};
      document.documentElement.setAttribute("data-dsh-plugins-store", "1");
      var style = document.getElementById("dsh-plugins-store-css");
      if (!style) {
        style = document.createElement("style");
        style.id = "dsh-plugins-store-css";
        document.head.appendChild(style);
      }
      style.textContent = [
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.composer"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.composer.bar"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.composer.footer"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.input"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.view"]{width:100%!important;max-width:none!important;flex:1 1 auto!important;min-width:0!important}',
        'html[data-dsh-plugins-store="1"] *:has([data-dsh-plugins-catalog]){max-width:none!important}'
      ].join("");
      var extra = [];
      function hideNode(el) {
        if (!el || el.getAttribute("data-dsh-plugins-hid")) return;
        if (el.querySelector && el.querySelector("[data-dsh-plugins-catalog]")) return;
        el.setAttribute("data-dsh-plugins-hid", "1");
        el.setAttribute("data-dsh-plugins-disp", el.style.display || "");
        el.style.display = "none";
        extra.push(el);
      }
      var fields = document.querySelectorAll("textarea, input, [contenteditable='true']");
      for (var i = 0; i < fields.length; i++) {
        var el = fields[i];
        var ph = String(el.getAttribute("placeholder") || el.getAttribute("aria-label") || "");
        if (!/给智能体发消息|发消息|Send message/i.test(ph)) continue;
        var node = el;
        var found = null;
        for (var k = 0; k < 10 && node && node !== document.body; k++) {
          var pos = "";
          try { pos = window.getComputedStyle(node).position; } catch (e) {}
          if (pos === "fixed" || pos === "absolute" || pos === "sticky") { found = node; break; }
          node = node.parentElement;
        }
        hideNode(found || el.parentElement);
      }
      return function () {
        document.documentElement.removeAttribute("data-dsh-plugins-store");
        if (style && style.parentNode) style.parentNode.removeChild(style);
        for (var j = 0; j < extra.length; j++) {
          var n = extra[j];
          if (!n) continue;
          n.style.display = n.getAttribute("data-dsh-plugins-disp") || "";
          n.removeAttribute("data-dsh-plugins-hid");
          n.removeAttribute("data-dsh-plugins-disp");
        }
      };
    }

    function ownerOf(full) {
      var s = String(full || "");
      var i = s.indexOf("/");
      return i > 0 ? s.slice(0, i) : "";
    }
    function repoUrl(p) {
      var full = String((p && p.full_name) || "").trim();
      var u = String((p && (p.url || p.html_url)) || "").trim();
      if (/^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i.test(u)) return u.replace(/\/$/, "");
      if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full)) return "https://github.com/" + full;
      return "";
    }
    function openExternal(url) {
      url = String(url || "").trim();
      if (!/^https:\/\//i.test(url)) return;
      function invokeTauri(cmd, args) {
        try {
          var inv = (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke)
            || (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke);
          if (inv) return inv(cmd, args);
        } catch (e) {}
        return null;
      }
      try {
        var t = window.__TAURI__;
        if (t && t.opener && t.opener.openUrl) { t.opener.openUrl(url); return; }
        if (t && t.shell && t.shell.open) { t.shell.open(url); return; }
      } catch (e) {}
      var p1 = invokeTauri("plugin:opener|open_url", { url: url });
      if (p1 && p1.then) {
        p1.catch(function () {
          var p2 = invokeTauri("plugin:shell|open", { path: url });
          if (!(p2 && p2.then)) fallbackOpen(url);
          else p2.catch(function () { fallbackOpen(url); });
        });
        return;
      }
      fallbackOpen(url);
    }
    function fallbackOpen(url) {
      var w = null;
      try { w = window.open(url, "_blank", "noopener,noreferrer"); } catch (e) {}
      if (w) return;
      fetch("/api/dsh-plugins/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url })
      }).catch(function () {});
    }
    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      return Promise.reject(new Error("no clipboard"));
    }
    function excerpt(s, max) {
      s = String(s || "").replace(/\r\n/g, "\n").trim();
      max = max || 12000;
      if (s.length > max) s = s.slice(0, max) + "…";
      return s;
    }
    function coverH(size) {
      return size === "medium" ? 200 : 0;
    }
    function readLocalUi() {
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) return { showSidebar: true, coverSize: "large" };
        var o = JSON.parse(raw);
        return {
          showSidebar: o.showSidebar !== false,
          coverSize: o.coverSize === "medium" ? "medium" : "large"
        };
      } catch (e) {
        return { showSidebar: true, coverSize: "large" };
      }
    }
    function writeLocalUi(partial) {
      var cur = readLocalUi();
      if (partial.showSidebar !== undefined) cur.showSidebar = !!partial.showSidebar;
      if (partial.coverSize) cur.coverSize = partial.coverSize === "medium" ? "medium" : "large";
      try { localStorage.setItem(LS_KEY, JSON.stringify(cur)); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent(EVT, { detail: cur })); } catch (e) {}
      return cur;
    }
    function chipStyle(on) {
      return {
        display: "inline-block",
        padding: "3px 10px",
        margin: "0 6px 6px 0",
        borderRadius: 999,
        border: "1px solid " + (on ? BRAND : LINE),
        background: BG,
        color: on ? BRAND : FG,
        cursor: "pointer",
        fontSize: 12,
        lineHeight: "18px"
      };
    }
    function btnStyle(disabled, primary, danger) {
      var color = disabled ? MUTED : (danger ? ERR : (primary ? BRAND : FG));
      var border = (danger && !disabled) ? ERR : (primary && !disabled ? BRAND : LINE);
      return {
        padding: "6px 12px",
        borderRadius: 6,
        border: "1px solid " + border,
        background: BG,
        color: color,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        lineHeight: "18px"
      };
    }
    function inputStyle() {
      return {
        flex: 1,
        minWidth: 0,
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid " + LINE,
        background: BG,
        color: FG,
        fontSize: 13,
        outline: "none"
      };
    }
    function cmdStyle() {
      return {
        display: "block",
        width: "100%",
        maxWidth: "100%",
        marginTop: 8,
        padding: "4px 0",
        border: "none",
        background: "transparent",
        color: MUTED,
        fontSize: 11,
        lineHeight: "16px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: "pointer",
        textAlign: "left",
        boxSizing: "border-box"
      };
    }
    function matchItem(p, q, scope, cat) {
      if (scope === "official" && !p.official) return false;
      if (scope === "community" && p.official) return false;
      if (cat && cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      var blob = [p.name, p.full_name, p.author, p.description, p.description_zh, p.description_en, p.category_zh, p.category].join(" ").toLowerCase();
      return blob.indexOf(q) >= 0;
    }
    function overlay(node) {
      // Render in place instead of portaling to document.body: the store page
      // is a full-screen fixed layer, and a body-portaled modal with the same
      // z-index can be covered by it in the desktop shell. Rendering the modal
      // inside the tree keeps it above the page it belongs to.
      return node;
    }

    function sectionTitle(text) {
      return h("div", {
        style: { fontSize: 13, fontWeight: 600, color: FG, margin: "16px 0 8px" }
      }, text);
    }

    function DetailModal(props) {
      var p = props.p;
      var detail = props.detail;
      var onClose = props.onClose;
      var full = p.full_name || "";
      var pkgName = p.npm_name || p.name || "";
      var id = pkgName || full;
      var author = p.author || ownerOf(full);
      var zh = p.description_zh || p.description || "";
      var en = p.description_en || "";
      var imgs = (detail && detail.images) || [];
      if (imgs.length > 16) imgs = imgs.slice(0, 16);
      var ci = useState(0);
      var curIdx = ci[0], setCurIdx = ci[1];
      var safeIdx = imgs.length ? (curIdx % imgs.length) : 0;
      function prevImg() {
        if (!imgs.length) return;
        setCurIdx((safeIdx + imgs.length - 1) % imgs.length);
      }
      function nextImg() {
        if (!imgs.length) return;
        setCurIdx((safeIdx + 1) % imgs.length);
      }
      var readmeZh = excerpt((detail && detail.readme_zh) || "", 12000);
      var readmeEn = excerpt((detail && detail.readme_en) || "", 12000);
      var readme = readmeZh || readmeEn;
      var node = h("div", {
        onClick: onClose,
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 10001,
          background: "rgba(0,0,0,0.48)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box"
        }
      },
        h("div", {
          onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); },
          style: {
            // Adaptive full-size: follows the viewport (94vw / up to 92vh),
            // grows with a large window, stays compact on a small one.
            width: "min(1200px, 94vw)",
            maxHeight: "92vh",
            minHeight: "60vh",
            overflow: "auto",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "18px 20px 24px",
            boxSizing: "border-box",
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)"
          }
        },
          h("div", {
            style: {
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
              paddingRight: 40
            }
          },
            h("div", { style: { minWidth: 0 } },
              h("div", { style: { fontSize: 18, fontWeight: 650, color: FG } }, p.name || pkgName || full),
              h("div", { style: { color: MUTED, fontSize: 12, marginTop: 4 } },
                (author ? author + " · " : "") + (p.category_zh || p.category || "") +
                (full ? " · " + full : "")
              )
            )
          ),
          (detail && detail.loading) ? h("div", { style: { color: MUTED, marginTop: 12 } }, "正在加载效果图和文档…") : null,
          (detail && detail.error) ? h("div", { style: { color: ERR, marginTop: 12 } }, detail.error) : null,
          sectionTitle("效果图"),
          imgs.length ? h("div", {
            style: {
              position: "relative",
              height: 340,
              borderRadius: 8,
              overflow: "hidden",
              background: "rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
            h("a", {
              href: imgs[safeIdx],
              target: "_blank",
              rel: "noreferrer",
              style: { display: "block", width: "100%", height: "100%", textAlign: "center" }
            },
              h("img", {
                src: imgs[safeIdx],
                alt: "",
                style: {
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "inline-block",
                  verticalAlign: "middle"
                }
              })
            ),
            imgs.length > 1 ? h("button", {
              type: "button",
              title: "上一张",
              onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); prevImg(); },
              style: {
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "rgba(0,0,0,0.35)",
                color: "#ffffff",
                width: 34,
                height: 34,
                borderRadius: 999,
                fontSize: 20,
                lineHeight: "30px",
                cursor: "pointer",
                padding: 0,
                textAlign: "center"
              }
            }, "‹") : null,
            imgs.length > 1 ? h("button", {
              type: "button",
              title: "下一张",
              onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); nextImg(); },
              style: {
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "rgba(0,0,0,0.35)",
                color: "#ffffff",
                width: 34,
                height: 34,
                borderRadius: 999,
                fontSize: 20,
                lineHeight: "30px",
                cursor: "pointer",
                padding: 0,
                textAlign: "center"
              }
            }, "›") : null,
            imgs.length > 1 ? h("div", {
              style: {
                position: "absolute",
                bottom: 8,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: 6
              }
            },
              imgs.map(function (_, i) {
                return h("button", {
                  key: i,
                  type: "button",
                  title: "第 " + (i + 1) + " 张",
                  onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); setCurIdx(i); },
                  style: {
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    background: i === safeIdx ? BRAND : "rgba(0,0,0,0.25)"
                  }
                })
              })
            ) : null
          ) : h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无 README 效果图"),
          sectionTitle("介绍"),
          zh ? h("div", { style: { color: FG, fontSize: 13, lineHeight: "22px", marginBottom: 8 } }, zh) : null,
          en ? h("div", { style: { color: MUTED, fontSize: 12, lineHeight: "20px" } }, en) : null,
          (!zh && !en) ? h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无简介") : null,
          sectionTitle("文档"),
          readme ? h("div", {
            style: {
              color: FG,
              fontSize: 12,
              lineHeight: "20px",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere"
            }
          }, readme) : h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无 README"),
          full ? h("div", { style: { marginTop: 16 } },
            h("button", {
              type: "button",
              onClick: function (e) {
                if (e && e.preventDefault) e.preventDefault();
                if (e && e.stopPropagation) e.stopPropagation();
                openExternal(repoUrl(p) || ("https://github.com/" + full));
              },
              style: btnStyle(false, true)
            }, "在 GitHub 打开")
          ) : null
        ),
        // Close button pinned to the viewport top-right, always visible even
        // while the content box scrolls.
        h("button", {
          type: "button",
          title: "关闭",
          onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); onClose(); },
          style: {
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 10002,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            fontWeight: 600,
            fontSize: 13,
            lineHeight: "20px",
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)"
          }
        }, "✕ 关闭")
      );
      return overlay(node);
    }

    function PluginCard(props) {
      var p = props.p;
      var install = props.install;
      var uninstall = props.uninstall;
      var waiting = props.waiting;
      var busyUn = props.busyUn;
      var installed = !!props.installed;
      var isSelf = !!props.isSelf;
      var note = props.note;
      var onUpdate = props.onUpdate;
      var busyUp = !!props.busyUp;
      var hasUpdate = !!(props.hasUpdate || (p && p.newer));
      var hCover = coverH(props.coverSize);
      var ex = useState(false);
      var open = ex[0], setOpen = ex[1];
      var cp = useState(false);
      var copied = cp[0], setCopied = cp[1];
      var dt = useState(null);
      var detail = dt[0], setDetail = dt[1];
      var full = p.full_name || "";
      var id = p.npm_name || p.name || full;
      var author = p.author || ownerOf(full);
      var cmd = (p.install_method === "link" || p.install === "link") ? "" : (p.install || "");
      var linkOnly = p.install_method === "link" || p.install === "link" || /(^|\/)awesome-dsh-plugins$/i.test(full);
      var cover = full ? ("https://opengraph.githubassets.com/1/" + full) : "";
      function onCopy() {
        if (!cmd) return;
        copyText(cmd).then(function () {
          setCopied(true);
          setTimeout(function () { setCopied(false); }, 1200);
        }).catch(function () {});
      }
      function onOpenDetail() {
        setOpen(true);
        if (!detail && full) {
          setDetail({ loading: true, images: [], readme_zh: "", readme_en: "", error: "" });
          fetch("/api/dsh-plugins/detail?full_name=" + encodeURIComponent(full))
            .then(function (r) { return r.json(); })
            .then(function (data) {
              var imgs = (data && data.images) || [];
              if ((!imgs || !imgs.length) && data && data.og) imgs = [data.og];
              setDetail({
                loading: false,
                images: imgs,
                readme_zh: (data && data.readme_zh) || "",
                readme_en: (data && data.readme_en) || "",
                error: data && data.ok === false ? ((data.error || data.message) || "加载失败") : ""
              });
            })
            .catch(function (e) {
              setDetail({
                loading: false,
                images: [],
                readme_zh: "",
                readme_en: "",
                error: String((e && e.message) || e || "加载失败")
              });
            });
        }
      }
      var zh = p.description_zh || "";
      var en = p.description_en || "";
      return h("div", {
        onClick: function (e) {
          var t = e && e.target;
          if (t && t.closest && t.closest("button, a, input, textarea")) return;
          onOpenDetail();
        },
        style: {
          border: "1px solid " + LINE,
          background: BG,
          borderRadius: 8,
          padding: 10,
          overflow: "hidden",
          maxWidth: "100%",
          boxSizing: "border-box",
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer"
        }
      },
        cover ? h("img", {
          src: cover,
          alt: "",
          style: {
            width: "100%",
            height: "auto",
            maxHeight: hCover || "none",
            aspectRatio: "2 / 1",
            objectFit: "contain",
            objectPosition: "center top",
            background: "rgba(0,0,0,0.06)",
            borderRadius: 6,
            marginBottom: 8,
            display: "block"
          }
        }) : null,
        h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          h("span", { style: { fontWeight: 600, fontSize: 14, color: FG } }, p.name || full),
          installed ? h("span", {
            style: {
              fontSize: 11,
              padding: "1px 6px",
              borderRadius: 999,
              border: "1px solid " + (p.warning ? ERR : OK),
              color: p.warning ? ERR : OK,
              background: BG
            }
          }, p.warning ? "无法加载" : "已安装") : null,
          (hasUpdate || p.newer) ? h("span", {
            style: {
              fontSize: 11,
              padding: "1px 6px",
              borderRadius: 999,
              border: "1px solid " + BRAND,
              color: BRAND,
              background: BG
            }
          }, "有更新") : null,
          p.official ? h("span", {
            style: {
              fontSize: 11,
              padding: "1px 6px",
              borderRadius: 999,
              border: "1px solid " + BRAND,
              color: BRAND,
              background: BG
            }
          }, "官方") : null,
          (p.install_method === "npm" || p.npm_name) ? h("span", {
            style: { fontSize: 11, padding: "1px 6px", borderRadius: 999, border: "1px solid " + BRAND, color: BRAND, background: BG }
          }, "npm") : null,
          h("span", { style: { color: MUTED, fontSize: 12 } }, "stars " + (p.stars || 0))
        ),
        h("div", { style: { color: MUTED, fontSize: 12, marginTop: 4 } },
          (author ? author + " · " : "") + (p.category_zh || p.category || "")
        ),
        (p.current || p.latest) ? h("div", { style: { color: MUTED, fontSize: 12, marginTop: 2 } },
          "当前 " + (p.current || "-") + (p.latest ? " → 最新 " + p.latest : "")
        ) : null,
        (p.install_method === "npm" || p.npm_name) ? h("div", { style: { color: MUTED, fontSize: 11, marginTop: 2 } }, "请用 npm 包名安装，不要用 github:") : null,
        linkOnly ? h("div", { style: { color: MUTED, fontSize: 11, marginTop: 2 } }, "这是目录索引，不能当插件安装") : null,
        p.status === "error" ? h("div", { style: { color: MUTED, fontSize: 11, marginTop: 2 } }, "检查失败") : null,
        h("div", {
          style: {
            marginTop: 6,
            color: FG,
            fontSize: 12,
            lineHeight: "18px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 54,
            height: 54
          }
        }, p.description || zh || en || ""),
        h("button", {
          type: "button",
          title: cmd ? "点击复制安装命令" : "",
          onClick: cmd ? onCopy : undefined,
          style: Object.assign({}, cmdStyle(), { visibility: cmd ? "visible" : "hidden" })
        }, copied ? "已复制" : (cmd || " ")),
        h("div", { style: { marginTop: "auto", paddingTop: 10, display: "flex", gap: 8, flexWrap: "wrap" } },
          (!installed && !linkOnly) ? h("button", {
            type: "button",
            disabled: waiting || !id,
            onClick: function () { if (install) install(id, p); },
            style: btnStyle(waiting || !id, true)
          }, waiting ? "安装中…" : "安装") : null,
          (installed && hasUpdate && onUpdate) ? h("button", {
            type: "button",
            disabled: busyUp || !id,
            onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); onUpdate(id); },
            style: btnStyle(busyUp || !id, true)
          }, busyUp ? "更新中…" : "更新") : null,
          installed ? h("button", {
            type: "button",
            disabled: busyUn || isSelf || !id || p.removable === false,
            title: isSelf ? "这是插件库本身" : "卸载此插件",
            onClick: function () { if (uninstall) uninstall(id); },
            style: btnStyle(busyUn || isSelf || !id || p.removable === false, false, !isSelf)
          }, busyUn ? "卸载中…" : "卸载") : null,
          h("button", {
            type: "button",
            onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); onOpenDetail(); },
            style: btnStyle(false, false)
          }, "详情")
        ),
        open ? h(DetailModal, {
          p: p,
          detail: detail,
          onClose: function () { setOpen(false); }
        }) : null,
        note ? h("div", {
          style: { marginTop: 8, color: note.ok ? OK : ERR, fontSize: 12 }
        }, note.text) : null,
        p.warning ? h("div", {
          style: { marginTop: 8, color: ERR, fontSize: 12, lineHeight: "18px" }
        },
          p.warning,
          (p.issues_url || full) ? h("div", { style: { marginTop: 6 } },
            h("a", {
              href: p.issues_url || ("https://github.com/" + full + "/issues"),
              target: "_blank",
              rel: "noreferrer",
              onClick: function (e) {
                if (e && e.preventDefault) e.preventDefault();
                if (e && e.stopPropagation) e.stopPropagation();
                openExternal(p.issues_url || ("https://github.com/" + full + "/issues"));
              },
              style: { color: BRAND, fontWeight: 650 }
            }, "联系作者")
          ) : null
        ) : null
      );
    }

    function CatalogDrawer(props) {
      var onClose = props.onClose;
      var coverSize = props.coverSize || "large";
      var st = useState([]);
      var plugins = st[0], setPlugins = st[1];
      var ld = useState(true);
      var loading = ld[0], setLoading = ld[1];
      var er = useState("");
      var error = er[0], setError = er[1];
      var dr = useState("");
      var draft = dr[0], setDraft = dr[1];
      var qst = useState("");
      var query = qst[0], setQuery = qst[1];
      var sc = useState("all");
      var scope = sc[0], setScope = sc[1];
      var ct = useState("all");
      var cat = ct[0], setCat = ct[1];
      var sd = useState("stars-desc");
      var sort = sd[0], setSort = sd[1];
      var bz = useState({});
      var busy = bz[0], setBusy = bz[1];
      var ms = useState({});
      var notes = ms[0], setNotes = ms[1];
      var pg = useState(1);
      var page = pg[0], setPage = pg[1];
      var upd = useState(null);
      var updateInfo = upd[0], setUpdateInfo = upd[1];
      var ub = useState(false);
      var updating = ub[0], setUpdating = ub[1];
      var un = useState(null);
      var updateNote = un[0], setUpdateNote = un[1];
      var vw = useState("discover");
      var view = vw[0], setView = vw[1];
      var inst = useState([]);
      var installed = inst[0], setInstalled = inst[1];
      var rn = useState(readRestartNeeded());
      var restartNeeded = rn[0], setRestartNeeded = rn[1];
      var bu = useState({});
      var busyUn = bu[0], setBusyUn = bu[1];
      var bup = useState({});
      var busyUp = bup[0], setBusyUp = bup[1];
      var nc = useState(0);
      var newerCount = nc[0], setNewerCount = nc[1];
      var rm = useState(false);
      var showRestartModal = rm[0], setShowRestartModal = rm[1];
      var ck = useState(false);
      var checking = ck[0], setChecking = ck[1];
      var listRef = useRef(null);
      var checkedInstalled = useRef(false);

      function markRestart() {
        writeRestartNeeded(true);
        setRestartNeeded(true);
      }
      function refreshInstalled() {
        fetchInstalled(function (err, list) {
          if (list) setInstalled(list);
        });
      }
      function applyUpdateData(data, info) {
        if (info) {
          setUpdateInfo(info);
          setNewerCount(info.newerCount || 0);
        } else if (data && data.self) {
          setUpdateInfo({
            ok: !!data.ok,
            newer: !!(data.self && data.self.newer),
            current: (data.self && data.self.current) || "",
            latest: (data.self && data.self.latest) || "",
            latestSha: (data.self && data.self.latestSha) || "",
            status: (data.self && data.self.status) || "",
            newerCount: data.newerCount || 0,
            installed: data.installed || []
          });
          setNewerCount(data.newerCount || 0);
        }
        var rows = (data && data.installed) || (info && info.installed) || [];
        if (rows && rows.length) {
          setInstalled(function (cur) {
            var byFull = {};
            for (var i = 0; i < rows.length; i++) {
              var k = itemKey(rows[i]);
              if (k) byFull[k] = rows[i];
              if (rows[i] && rows[i].full_name) byFull[rows[i].full_name] = rows[i];
            }
            if (!cur || !cur.length) return rows;
            var seen = {};
            var merged = cur.map(function (row) {
              var k = itemKey(row);
              var u = byFull[k] || byFull[row.full_name];
              if (k) seen[k] = true;
              if (row.full_name) seen[row.full_name] = true;
              return u ? Object.assign({}, row, u) : row;
            });
            for (var j = 0; j < rows.length; j++) {
              var add = rows[j];
              var ak = itemKey(add);
              if (add && ak && !seen[ak] && !seen[add.full_name]) merged.push(add);
            }
            return merged;
          });
        }
      }
      function refreshUpdates(cb) {
        setChecking(true);
        fetchUpdateInfo(function (err, info, data) {
          setChecking(false);
          if (err) {
            setUpdateInfo({ ok: false, status: "error", newer: false, newerCount: 0, installed: [] });
            if (cb) cb(err);
            return;
          }
          applyUpdateData(data, info);
          if (cb) cb(null, info, data);
        });
      }

      useEffect(function () {
        if (listRef.current) listRef.current.scrollTop = 0;
      }, [page, query, scope, cat, view]);

      useEffect(function () {
        var dead = false;
        fetchUpdateInfo(function (err, info, data) {
          if (dead) return;
          if (err) setUpdateInfo({ ok: false, status: "error", newer: false, newerCount: 0, installed: [] });
          else if (info) applyUpdateData(data, info);
        });
        return function () { dead = true; };
      }, []);

      useEffect(function () {
        if (view !== "installed") return;
        if (checkedInstalled.current) return;
        checkedInstalled.current = true;
        refreshUpdates();
      }, [view]);

      useEffect(function () {
        var dead = false;
        setLoading(true);
        fetch("/api/dsh-plugins/catalog")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (dead) return;
            if (!data || !data.ok) {
              setError((data && data.error) || "目录加载失败");
              setPlugins([]);
            } else {
              setError("");
              setPlugins(data.plugins || []);
            }
          })
          .catch(function (e) {
            if (!dead) setError(String((e && e.message) || e || "目录加载失败"));
          })
          .then(function () { if (!dead) setLoading(false); });
        return function () { dead = true; };
      }, []);

      var onSearch = useCallback(function (e) {
        if (e && e.preventDefault) e.preventDefault();
        setQuery((draft || "").trim().toLowerCase());
        setPage(1);
      }, [draft]);

      var install = useCallback(function (full, item) {
        if (!full || busy[full]) return;
        setBusy(function (b) {
          var n = {};
          for (var k in b) n[k] = b[k];
          n[full] = true;
          return n;
        });
        setNotes(function (m) {
          var n = {};
          for (var k in m) n[k] = m[k];
          delete n[full];
          return n;
        });
        var payload = { full_name: (item && item.full_name) || full };
        if (item && item.npm_name) { payload.spec = item.npm_name; payload.name = item.npm_name; }
        fetch("/api/dsh-plugins/install", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var usable = !data || data.usable !== false;
            var text = (data && (data.message || data.error || data.stderr)) || (data && data.ok ? "已安装" : "安装失败");
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[full] = { ok: !!(data && data.ok && usable), text: String(text) };
              return n;
            });
            if (data && data.ok) {
              if (usable) markRestart();
              refreshInstalled();
            }
          })
          .catch(function (e) {
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[full] = { ok: false, text: String((e && e.message) || e || "安装失败") };
              return n;
            });
          })
          .then(function () {
            setBusy(function (b) {
              var n = {};
              for (var k in b) if (k !== full) n[k] = b[k];
              return n;
            });
          });
      }, [busy]);

      var uninstall = useCallback(function (full) {
        if (!full || busyUn[full]) return;
        setBusyUn(function (b) {
          var n = {};
          for (var k in b) n[k] = b[k];
          n[full] = true;
          return n;
        });
        setNotes(function (m) {
          var n = {};
          for (var k in m) n[k] = m[k];
          delete n[full];
          return n;
        });
        fetch("/api/dsh-plugins/uninstall", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: full })
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var text = (data && (data.message || data.error || data.stderr)) || (data && data.ok ? "已卸载" : "卸载失败");
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[full] = { ok: !!(data && data.ok), text: String(text) };
              return n;
            });
            if (data && data.ok) {
              markRestart();
              refreshInstalled();
            }
          })
          .catch(function (e) {
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[full] = { ok: false, text: String((e && e.message) || e || "卸载失败") };
              return n;
            });
          })
          .then(function () {
            setBusyUn(function (b) {
              var n = {};
              for (var k in b) if (k !== full) n[k] = b[k];
              return n;
            });
          });
      }, [busyUn]);

      function afterUpdateOk() {
        markRestart();
        setShowRestartModal(true);
        refreshUpdates();
      }
      function updateOne(full) {
        if (!full || busyUp[full]) return;
        setBusyUp(function (b) {
          var n = {};
          for (var k in b) n[k] = b[k];
          n[full] = true;
          return n;
        });
        runUpdate(full, function (err, data) {
          setBusyUp(function (b) {
            var n = {};
            for (var k in b) if (k !== full) n[k] = b[k];
            return n;
          });
          if (err || !data || !data.ok) {
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[full] = { ok: false, text: String((err && err.message) || (data && (data.message || data.error)) || "更新失败") };
              return n;
            });
            return;
          }
          setNotes(function (m) {
            var n = {};
            for (var k in m) n[k] = m[k];
            n[full] = { ok: true, text: "已更新 " + full };
            return n;
          });
          afterUpdateOk();
        });
      }
      function updateAllNow() {
        if (updating || !newerCount) return;
        setUpdating(true);
        runUpdate("all", function (err, data) {
          setUpdating(false);
          if (err || !data || !data.ok) {
            setUpdateNote({ ok: false, text: String((err && err.message) || (data && (data.message || data.error)) || "更新失败") });
            return;
          }
          setUpdateNote(null);
          afterUpdateOk();
        });
      }

      var installedMap = {};
      for (var im = 0; im < installed.length; im++) {
        var ik = itemKey(installed[im]);
        if (ik) installedMap[ik] = installed[im];
        if (installed[im] && installed[im].full_name) installedMap[installed[im].full_name] = installed[im];
        if (installed[im] && installed[im].npm_name) installedMap[installed[im].npm_name] = installed[im];
      }

      var matched = [];
      if (view === "installed") {
        for (var i = 0; i < installed.length; i++) {
          var card = cardFromInstalled(installed[i]);
          var q = query || "";
          if (q) {
            var blob = [card.name, card.full_name, card.author, card.npm_name].join(" ").toLowerCase();
            if (blob.indexOf(q) < 0) continue;
          }
          matched.push(card);
        }
      } else {
        for (var i = 0; i < plugins.length; i++) {
          if (matchItem(plugins[i], query, scope, cat)) matched.push(plugins[i]);
        }
      }
      if (view !== "installed") {
        var sortAsc = sort === "stars-asc";
        matched.sort(function (a, b) {
          var sa = Number(a && a.stars) || 0;
          var sb = Number(b && b.stars) || 0;
          if (sa !== sb) return sortAsc ? (sa - sb) : (sb - sa);
          var ra = Number(a && a.rank) || 0;
          var rb = Number(b && b.rank) || 0;
          return ra - rb;
        });
      }
      var pageSize = 12;
      var pages = Math.max(1, Math.ceil(matched.length / pageSize) || 1);
      var cur = page;
      if (cur > pages) cur = pages;
      if (cur < 1) cur = 1;
      var shown = matched.slice((cur - 1) * pageSize, cur * pageSize);

      var chips = [];
      for (var si = 0; si < SCOPES.length; si++) {
        (function (item) {
          chips.push(h("button", {
            key: "s-" + item.id,
            type: "button",
            onClick: function () { setScope(item.id); setPage(1); },
            style: chipStyle(scope === item.id)
          }, item.zh));
        })(SCOPES[si]);
      }
      var catChips = [];
      for (var ci = 0; ci < CATS.length; ci++) {
        (function (item) {
          catChips.push(h("button", {
            key: "c-" + item.id,
            type: "button",
            onClick: function () { setCat(item.id); setPage(1); },
            style: chipStyle(cat === item.id)
          }, item.zh));
        })(CATS[ci]);
      }
      var cards = [];
      for (var j = 0; j < shown.length; j++) {
        (function (item) {
          var full = item.full_name || "";
          var id = itemKey(item) || full;
          var row = installedMap[id] || installedMap[full] || installedMap[item.npm_name] || installedMap[item.name];
          var cardItem = item;
          if (row) {
            cardItem = {};
            for (var ck in item) cardItem[ck] = item[ck];
            if (row.warning && !item.warning) cardItem.warning = row.warning;
            if (row.issues_url) cardItem.issues_url = row.issues_url;
            if (row.usable === false) cardItem.usable = false;
            if (row.newer) cardItem.newer = true;
            if (row.current || row.version) cardItem.current = row.current || row.version;
            if (row.latest) cardItem.latest = row.latest;
            if (row.status) cardItem.status = row.status;
          }
          cards.push(h(PluginCard, {
            key: id || full || String(item.rank) + item.name,
            p: cardItem,
            install: install,
            uninstall: uninstall,
            waiting: !!busy[id] || !!busy[full],
            busyUn: !!busyUn[id] || !!busyUn[full],
            busyUp: !!busyUp[id] || !!busyUp[full],
            hasUpdate: !!(cardItem.newer || (row && row.newer)),
            onUpdate: updateOne,
            installed: !!(row || item.installed),
            isSelf: !!(row && row.self) || full === SELF_FULL,
            note: notes[full],
            coverSize: coverSize
          }));
        })(shown[j]);
      }

      return h("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          alignSelf: "stretch",
          color: FG,
          fontSize: 13,
          lineHeight: "20px",
          boxSizing: "border-box"
        }
      },
        h("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid " + LINE,
            flexShrink: 0
          }
        },
          h("div", {
            style: {
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10
            }
          },
            h("div", { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap" } },
              h("div", { style: { fontSize: 16, fontWeight: 600, color: FG } }, "插件库"),
              h("button", {
                type: "button",
                onClick: function () { setView("installed"); setPage(1); },
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid " + (view === "installed" ? BRAND : LINE),
                  background: BG,
                  color: view === "installed" ? BRAND : FG,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 650,
                  lineHeight: "18px"
                }
              }, "已安装 " + installed.length + (newerCount ? " · " + newerCount + " 个可更新" : ""))
            ),
            onClose ? h("button", { type: "button", onClick: onClose, style: btnStyle(false, false) }, "关闭") : null
          )
        ),
        h("div", {
          ref: listRef,
          style: {
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 20px 20px",
            width: "100%",
            boxSizing: "border-box"
          }
        },
          h(RestartBanner, {
            show: restartNeeded,
            onDismiss: function () {
              writeRestartNeeded(false);
              setRestartNeeded(false);
            }
          }),
          (function () {
            var broken = installed.filter(function (x) { return x && x.warning; });
            if (!broken.length) return null;
            return h("div", {
              style: {
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid " + ERR,
                color: ERR,
                fontSize: 12,
                lineHeight: "18px"
              }
            }, broken.length + " 个无法加载，请联系对应插件作者");
          })(),
          h(UpdateBanner, {
            info: updateInfo,
            busy: updating,
            note: updateNote,
            onRetry: function () { refreshUpdates(); },
            onUpdate: function () {
              if (updating) return;
              setUpdating(true);
              setUpdateNote(null);
              runUpdate("self", function (err, data) {
                setUpdating(false);
                if (err) {
                  setUpdateNote({ ok: false, text: String((err && err.message) || err || "更新失败") });
                  return;
                }
                if (data && data.ok) {
                  setUpdateNote(null);
                  setUpdateInfo(function (cur) { return cur ? Object.assign({}, cur, { newer: false }) : cur; });
                  afterUpdateOk();
                } else {
                  setUpdateNote({ ok: false, text: (data && (data.message || data.error)) || "更新失败" });
                }
              });
            }
          }),
          h(RestartModal, {
            show: showRestartModal,
            onLater: function () { setShowRestartModal(false); },
            onRestart: function () { setShowRestartModal(false); restartNow(); }
          }),
          h("form", {
            onSubmit: onSearch,
            style: { display: "flex", gap: 8, marginBottom: 10, maxWidth: "100%" }
          },
            h("input", {
              value: draft,
              onChange: function (e) { setDraft(e.target.value); },
              placeholder: "搜索名称、作者或描述",
              style: inputStyle()
            }),
            h("button", { type: "submit", style: btnStyle(false, true) }, "搜索")
          ),
          h("div", { style: { marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("button", {
              type: "button",
              onClick: function () { setView("discover"); setPage(1); },
              style: chipStyle(view === "discover")
            }, "发现"),
            h("button", {
              type: "button",
              onClick: function () { setView("installed"); setPage(1); },
              style: chipStyle(view === "installed")
            }, "已安装"),
            view === "discover" ? h("span", { style: { color: LINE, margin: "0 4px 6px" } }, "|") : null,
            view === "discover" ? chips : null
          ),
          view === "discover" ? h("div", { style: { marginBottom: 10 } }, catChips) : null,
          view === "discover" ? h("div", { style: { marginBottom: 10, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" } },
            h("span", { style: { color: MUTED, fontSize: 12, marginRight: 6 } }, "排序"),
            h("button", {
              type: "button",
              onClick: function () { setSort("stars-desc"); setPage(1); },
              style: chipStyle(sort === "stars-desc")
            }, "按星 ↓"),
            h("button", {
              type: "button",
              onClick: function () { setSort("stars-asc"); setPage(1); },
              style: chipStyle(sort === "stars-asc")
            }, "按星 ↑")
          ) : null,
          (view === "discover" && loading) ? h("div", { style: { color: MUTED } }, "加载目录中…") : null,
          (view === "discover" && error) ? h("div", { style: { color: ERR, marginBottom: 8 } }, error) : null,
          (view === "installed" || (!loading && !error)) ? h("div", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }
          },
            h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
              h("div", { style: { color: MUTED } },
                (view === "installed" ? "已安装 " : "共 ") + matched.length + " 个插件 · 第 " + cur + "/" + pages + " 页"
              ),
              view === "installed" ? h("button", {
                type: "button",
                disabled: checking,
                onClick: function () { refreshUpdates(); },
                style: btnStyle(checking, false)
              }, checking ? "检查中…" : "检查更新") : null,
              view === "installed" ? h("button", {
                type: "button",
                disabled: updating || !newerCount,
                onClick: updateAllNow,
                style: btnStyle(updating || !newerCount, true)
              }, updating ? "更新中…" : "全部更新") : null,
              (view === "installed" && newerCount > 0) ? h("span", { style: { color: BRAND, fontWeight: 650, fontSize: 12 } }, newerCount + " 个可更新") : null
            ),
            matched.length > 0 ? h(Pager, { cur: cur, pages: pages, setPage: setPage }) : null
          ) : null,
          (view === "installed" || !loading) ? h("div", {
            "data-dsh-plugins-grid": "",
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 12,
              alignItems: "stretch"
            }
          }, cards) : null,
          ((view === "installed" || (!loading && !error)) && matched.length === 0) ? h("div", { style: { color: MUTED } },
            view === "installed"
              ? (installed.length === 0
                ? "还没有从目录安装过插件。去「发现」里点安装。"
                : "没有匹配的已安装插件")
              : "没有匹配的插件"
          ) : null,
          ((view === "installed" || (!loading && !error)) && matched.length > 0) ? h("div", { style: { marginTop: 14 } },
            h(Pager, { cur: cur, pages: pages, setPage: setPage })
          ) : null
        )
      );
    }

    function CatalogView() {
      var coverSize = readLocalUi().coverSize;
      var os = useState(storeOpen);
      var open = os[0], setOpen = os[1];
      useEffect(function () {
        var un = subscribeStoreOpen(function (v) { setOpen(v); });
        return un;
      }, []);
      useEffect(function () {
        if (open) return hideStoreChrome();
        return;
      }, [open]);
      if (!open) return null;
      // Full-screen opaque page rendered inside the shell.overlay layer. The
      // background is fully opaque so the conversation window is completely
      // hidden while the store is open. It must NOT portal to document.body:
      // the overlay layer is the shell's own stacking surface, and portaling
      // out of it can break z-order in the desktop shell.
      return h("div", {
        "data-dsh-plugins-catalog": "",
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: BG,
          color: FG,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          pointerEvents: "auto"
        }
      },
        h(CatalogErrorBoundary, null,
          h(CatalogDrawer, {
            coverSize: coverSize,
            onClose: function () { setStoreOpen(false); }
          })
        )
      );
    }

    // conversation.view variant: renders the catalog full-height inside the
    // view ring, activated by the header view tab (owner-driven `only`).
    function CatalogViewTab() {
      var coverSize = readLocalUi().coverSize;
      useEffect(function () {
        return hideStoreChrome();
      }, []);
      return h("div", {
        "data-dsh-plugins-catalog": "",
        style: {
          height: "100%",
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          flex: 1,
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }
      },
        h(CatalogErrorBoundary, null,
          h(CatalogDrawer, { coverSize: coverSize })
        )
      );
    }

    function SidebarStore(props) {
      var ui0 = readLocalUi();
      var sh = useState(ui0.showSidebar);
      var show = sh[0], setShow = sh[1];
      var cs = useState(ui0.coverSize);
      var coverSize = cs[0], setCoverSize = cs[1];
      var nw = useState(false);
      var hasUpdate = nw[0], setHasUpdate = nw[1];

      useEffect(function () {
        function onUp(e) {
          var d = (e && e.detail) || {};
          setHasUpdate(!!d.newer || (d.newerCount > 0));
        }
        window.addEventListener(UPD_EVT, onUp);
        fetchUpdateInfo(function (err, info) {
          if (info) setHasUpdate(!!info.newer || (info.newerCount > 0));
        });
        return function () { window.removeEventListener(UPD_EVT, onUp); };
      }, []);

      useEffect(function () {
        var dead = false;
        fetch("/api/dsh-plugins/prefs")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (dead || !data || !data.ok || !data.prefs) return;
            var p = data.prefs;
            var nextShow = p.showSidebar !== false;
            var nextCover = p.coverSize === "medium" ? "medium" : "large";
            setShow(nextShow);
            setCoverSize(nextCover);
            writeLocalUi({ showSidebar: nextShow, coverSize: nextCover });
          })
          .catch(function () {});
        function onEvt(e) {
          var d = (e && e.detail) || readLocalUi();
          setShow(d.showSidebar !== false);
          if (d.coverSize) setCoverSize(d.coverSize);
        }
        function onStorage(e) {
          if (e.key === LS_KEY) onEvt();
        }
        window.addEventListener(EVT, onEvt);
        window.addEventListener("storage", onStorage);
        return function () {
          dead = true;
          window.removeEventListener(EVT, onEvt);
          window.removeEventListener("storage", onStorage);
        };
      }, []);

      if (show === false) {
        return null;
      }

      // Render the sidebar entry as a normal slot cell so the shell places it
      // beside Settings. Previously the button was createPortal'd into a DOM
      // node scraped with hard-coded [data-slot] selectors; when those selectors
      // didn't match (different shell/skin), the button never appeared and the
      // catalog page could not be opened.
      return h("button", {
        type: "button",
        title: "插件库",
        className: "dsh-plugins-sidebar-btn",
        onClick: function (e) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          setStoreOpen(true);
        },
        // Aligned with the adjacent sidebar footer badges (settings / cordis
        // panel): same 49px height, same horizontal padding, same radius.
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          height: 49,
          padding: "0 8px 0 6px",
          border: "none",
          borderRadius: 12,
          background: "transparent",
          color: FG,
          cursor: "pointer",
          fontSize: 14,
          overflow: "hidden",
          boxSizing: "border-box",
          textAlign: "left",
          fontFamily: "inherit"
        }
      },
        h(PluginIcon),
        h("span", null, "插件"),
        hasUpdate ? h("span", {
          style: {
            marginLeft: "auto",
            fontSize: 11,
            lineHeight: "16px",
            padding: "0 6px",
            borderRadius: 999,
            background: BRAND,
            color: "#fff",
            fontWeight: 650
          }
        }, "更新") : null
      );
    }

    function SettingsManage() {
      var ui0 = readLocalUi();
      var pf = useState({
        showSidebar: ui0.showSidebar,
        coverSize: ui0.coverSize,
        autoUpdateSelf: true,
        autoUpdateOthers: false
      });
      var prefs = pf[0], setPrefs = pf[1];
      var st = useState("");
      var status = st[0], setStatus = st[1];
      var bz = useState(false);
      var busy = bz[0], setBusy = bz[1];
      var kind = useState("info");
      var statusKind = kind[0], setStatusKind = kind[1];
      var hasNew = useState(false);
      var newer = hasNew[0], setNewer = hasNew[1];
      var rm = useState(false);
      var showRestartModal = rm[0], setShowRestartModal = rm[1];

      useEffect(function () {
        var dead = false;
        fetch("/api/dsh-plugins/prefs")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (dead || !data || !data.ok || !data.prefs) return;
            setPrefs(data.prefs);
            writeLocalUi({
              showSidebar: data.prefs.showSidebar !== false,
              coverSize: data.prefs.coverSize
            });
          })
          .catch(function () {});
        return function () { dead = true; };
      }, []);

      useEffect(function () {
        fetchUpdateInfo(function (err, info) {
          if (!info) return;
          setNewer(!!info.newer);
          if (info.newer) {
            setStatusKind("warn");
            setStatus("发现新版本 " + (info.latest || info.latestSha || "") + "（当前 " + (info.current || "-") + "），请点「更新本插件」");
          }
        });
      }, []);

      function patchPrefs(partial) {
        setPrefs(function (p) { return Object.assign({}, p, partial); });
        if (partial.showSidebar !== undefined || partial.coverSize) writeLocalUi(partial);
        fetch("/api/dsh-plugins/prefs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(partial)
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.ok && data.prefs) setPrefs(data.prefs);
          })
          .catch(function () {});
      }

      function checkNow() {
        if (busy) return;
        setBusy(true);
        setStatus("正在检查更新…");
        fetch("/api/dsh-plugins/updates")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data || !data.ok) {
              setStatus((data && (data.error || data.message)) || "检查失败");
              return;
            }
            var self = data.self || {};
            function labelOf(item) {
              if (!item) return "检查失败";
              if (item.status === "error" || item.status === "unknown") return "检查失败";
              if (item.newer) return "有更新";
              if (item.status === "latest") return "已是最新";
              return "检查失败";
            }
            var lines = [];
            lines.push("本插件 " + (self.full_name || "Sakana-yuyu/dsh-plugins") +
              " 当前 " + (self.current || "-") +
              " / 最新 " + (self.latest || self.latestSha || "-") +
              " · " + labelOf(self));
            var inst = data.installed || [];
            if (!inst.length) lines.push("未发现已安装的 github: 目录插件");
            else {
              lines.push("已安装 " + inst.length + " 个：");
              for (var i = 0; i < inst.length; i++) {
                var it = inst[i];
                lines.push("- " + it.full_name + " 当前 " + (it.current || it.version || "-") + " / 最新 " + (it.latest || "-") + " · " + labelOf(it));
              }
            }
            var anyNewer = !!self.newer || !!(data.newerCount);
            var anyErr = self.status === "error" || inst.some(function (x) { return x && x.status === "error"; });
            setNewer(anyNewer);
            setStatusKind(anyNewer ? "warn" : (anyErr ? "err" : "ok"));
            setStatus(lines.join("\n"));
          })
          .catch(function (e) {
            setStatusKind("err");
            setStatus(String((e && e.message) || e || "检查失败"));
          })
          .then(function () { setBusy(false); });
      }

      function postUpdate(target) {
        if (busy) return;
        setBusy(true);
        setStatus(target === "all" ? "正在更新全部…" : "正在更新本插件…");
        fetch("/api/dsh-plugins/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target: target })
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var text;
            if (data && data.ok) text = data.message || "已更新。请完全退出 dsh-desktop 再打开，插件才会生效。";
            else text = (data && (data.message || data.error || data.stderr)) || "更新失败";
            setStatusKind((data && data.ok) ? "ok" : "err");
            if (data && data.ok) {
              setNewer(false);
              writeRestartNeeded(true);
              setShowRestartModal(true);
            }
            setStatus(String(text));
          })
          .catch(function (e) {
            setStatusKind("err");
            setStatus(String((e && e.message) || e || "更新失败"));
          })
          .then(function () { setBusy(false); });
      }

      function toggleRow(label, on, set) {
        return h("label", {
          style: { display: "flex", alignItems: "center", gap: 8, margin: "10px 0", cursor: "pointer", color: FG }
        },
          h("input", {
            type: "checkbox",
            checked: !!on,
            onChange: function (e) { set(e.target.checked); }
          }),
          h("span", null, label)
        );
      }

      return h("div", {
        style: {
          padding: "8px 4px 16px",
          color: FG,
          fontSize: 13,
          lineHeight: "20px",
          maxWidth: "100%",
          boxSizing: "border-box"
        }
      },
        h("div", { style: { fontSize: 16, fontWeight: 600, marginBottom: 4, color: FG } }, "插件库"),
        h(RestartModal, {
          show: showRestartModal,
          onLater: function () { setShowRestartModal(false); },
          onRestart: function () { setShowRestartModal(false); restartNow(); }
        }),
        h("div", { style: { color: MUTED, marginBottom: 12 } }, "管理侧边栏展示和自动更新"),
        toggleRow("在侧边栏显示插件库", prefs.showSidebar !== false, function (v) { patchPrefs({ showSidebar: v }); }),
        h("div", { style: { margin: "10px 0 6px", color: FG } }, "封面大小"),
        h("div", { style: { marginBottom: 10 } },
          h("button", {
            type: "button",
            onClick: function () { patchPrefs({ coverSize: "large" }); },
            style: chipStyle(prefs.coverSize !== "medium")
          }, "大图"),
          h("button", {
            type: "button",
            onClick: function () { patchPrefs({ coverSize: "medium" }); },
            style: chipStyle(prefs.coverSize === "medium")
          }, "中图")
        ),
        toggleRow("自动更新本目录插件", !!prefs.autoUpdateSelf, function (v) { patchPrefs({ autoUpdateSelf: v }); }),
        toggleRow("自动更新已安装的目录插件", !!prefs.autoUpdateOthers, function (v) { patchPrefs({ autoUpdateOthers: v }); }),
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 } },
          h("button", { type: "button", disabled: busy, onClick: checkNow, style: btnStyle(busy, true) }, "立即检查更新"),
          h("button", { type: "button", disabled: busy, onClick: function () { postUpdate("self"); }, style: btnStyle(busy, false) }, "更新本插件"),
          h("button", { type: "button", disabled: busy, onClick: function () { postUpdate("all"); }, style: btnStyle(busy, false) }, "更新全部")
        ),
        newer ? h("div", {
          style: {
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid " + BRAND,
            color: BRAND,
            fontWeight: 650
          }
        }, "有可用更新，请点「更新本插件」，完成后请完全退出 dsh-desktop 再打开") : null,
        status ? h("div", {
          style: {
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid " + (statusKind === "ok" ? OK : statusKind === "err" ? ERR : statusKind === "warn" ? BRAND : LINE),
            color: statusKind === "ok" ? OK : statusKind === "err" ? ERR : statusKind === "warn" ? BRAND : FG,
            background: BG,
            whiteSpace: "pre-wrap",
            fontSize: 13,
            lineHeight: "20px",
            fontWeight: 600
          }
        }, status) : null,
        h("div", { style: { marginTop: 14 } },
          h("a", {
            href: SITE,
            target: "_blank",
            rel: "noreferrer",
            onClick: function (e) {
              if (e && e.preventDefault) e.preventDefault();
              openExternal(SITE);
            },
            style: { color: BRAND, textDecoration: "none", fontSize: 12 }
          }, "在线目录")
        )
      );
    }

    function apply(ctx) {
      injectGridCss();
      // Top header view tab "插件" (owner-activated view ring).
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "dsh-plugins",
        order: 20,
        label: () => "插件",
      }, CatalogViewTab));
      // Full-screen panel opened from the sidebar "插件" button.
      ctx.slots.inject("shell.overlay", () => ctx.slots.register({
        name: "shell.overlay",
        id: "dsh-plugins-store",
        order: 60,
        label: () => "插件库",
      }, CatalogView));
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "dsh-plugins-catalog",
        order: 40,
        label: () => "插件",
        inject: () => ({}),
      }, SidebarStore));
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-plugins-catalog",
        order: 55,
        label: () => "插件",
        inject: () => ({}),
      }, SettingsManage));
    }

    exports.name = "dsh-plugins-catalog-client";
    exports.inject = ["slots"];
    exports.apply = apply;
    return module.exports;
  }
});
