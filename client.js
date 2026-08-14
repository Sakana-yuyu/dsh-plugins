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
    var BRAND = "var(--dsw-alias-brand-primary-new-colorprimary-new-color)";
    var FG = "var(--dsw-alias-label-primary)";
    var MUTED = "var(--dsw-alias-label-tertiary)";
    var LINE = "var(--dsw-alias-border-l2)";
    var BG = "var(--dsw-alias-bg-module-platform)";
    var ERR = "var(--dsw-alias-state-error-primary)";
    var OK = "var(--dsw-alias-state-success-primary)";
    var LS_KEY = "dsh-plugins-ui";
    var EVT = "dsh-plugins-ui";
    var UPD_EVT = "dsh-plugins-update";
    var RESTART_LS = "dsh-plugins-restart";
    var SELF_FULL = "Sakana-yuyu/dsh-plugins";
    var SITE = "https://sakana-yuyu.github.io/dsh-plugins/";

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
            latestSha: self.latestSha || "",
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
      fetch("/api/dsh-plugins/installed")
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
    function cardFromInstalled(row) {
      if (row && row.catalog) {
        var c = {};
        for (var k in row.catalog) c[k] = row.catalog[k];
        c.installed = true;
        if (row.warning) c.warning = row.warning;
        if (row.self) c.self = true;
        return c;
      }
      var full = (row && row.full_name) || "";
      var slash = full.indexOf("/");
      return {
        name: (row && row.name) || full,
        full_name: full,
        description: (row && row.spec) || "",
        install: "",
        author: slash > 0 ? full.slice(0, slash) : "",
        warning: (row && row.warning) || "",
        self: !!(row && row.self)
      };
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
      if (!info || !info.newer) return null;
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
          h("div", { style: { fontWeight: 650, color: BRAND } }, "目录插件有新版本"),
          h("div", { style: { fontSize: 12, color: MUTED, marginTop: 2 } },
            "当前 " + (info.current || "-") + " → " + (info.latestSha || "最新") + "，更新后请完全退出 dsh-desktop 再打开")
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
        '[data-dsh-plugins-grid]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}',
        '@media (max-width:1100px){[data-dsh-plugins-grid]{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
        '@media (max-width:720px){[data-dsh-plugins-grid]{grid-template-columns:1fr!important}}'
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
      return size === "medium" ? 88 : 112;
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
      if (createPortal && typeof document !== "undefined" && document.body) {
        return createPortal(node, document.body);
      }
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
      var author = p.author || ownerOf(full);
      var zh = p.description_zh || p.description || "";
      var en = p.description_en || "";
      var imgs = (detail && detail.images) || [];
      if (imgs.length > 16) imgs = imgs.slice(0, 16);
      var shot = [];
      for (var ii = 0; ii < imgs.length; ii++) {
        (function (src, idx) {
          shot.push(h("a", {
            key: String(idx) + src,
            href: src,
            target: "_blank",
            rel: "noreferrer",
            style: { display: "block", flex: "0 0 auto" }
          }, h("img", {
            src: src,
            alt: "",
            style: {
              maxHeight: 280,
              height: 280,
              width: "auto",
              maxWidth: "100%",
              objectFit: "contain",
              borderRadius: 8,
              display: "block",
              background: "rgba(0,0,0,0.04)"
            }
          })));
        })(imgs[ii], ii);
      }
      var readmeZh = excerpt((detail && detail.readme_zh) || "", 12000);
      var readmeEn = excerpt((detail && detail.readme_en) || "", 12000);
      var readme = readmeZh || readmeEn;
      var node = h("div", {
        onClick: onClose,
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 10000,
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
            width: "min(920px, 94vw)",
            maxHeight: "88vh",
            overflow: "auto",
            background: BG,
            color: FG,
            borderRadius: 12,
            border: "1px solid " + LINE,
            padding: "18px 20px 24px",
            boxSizing: "border-box"
          }
        },
          h("div", {
            style: {
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8
            }
          },
            h("div", { style: { minWidth: 0 } },
              h("div", { style: { fontSize: 18, fontWeight: 650, color: FG } }, p.name || full),
              h("div", { style: { color: MUTED, fontSize: 12, marginTop: 4 } },
                (author ? author + " · " : "") + (p.category_zh || p.category || "") +
                (full ? " · " + full : "")
              )
            ),
            h("button", { type: "button", onClick: onClose, style: btnStyle(false, false) }, "关闭")
          ),
          (detail && detail.loading) ? h("div", { style: { color: MUTED, marginTop: 12 } }, "正在加载效果图和文档…") : null,
          (detail && detail.error) ? h("div", { style: { color: ERR, marginTop: 12 } }, detail.error) : null,
          sectionTitle("效果图"),
          shot.length ? h("div", {
            style: {
              display: "flex",
              flexWrap: "nowrap",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 6
            }
          }, shot) : h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无 README 效果图"),
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
            h("a", {
              href: p.url || ("https://github.com/" + full),
              target: "_blank",
              rel: "noreferrer",
              style: { color: BRAND, textDecoration: "none", fontSize: 12 }
            }, "在 GitHub 打开")
          ) : null
        )
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
      var hCover = coverH(props.coverSize);
      var ex = useState(false);
      var open = ex[0], setOpen = ex[1];
      var cp = useState(false);
      var copied = cp[0], setCopied = cp[1];
      var dt = useState(null);
      var detail = dt[0], setDetail = dt[1];
      var full = p.full_name || "";
      var author = p.author || ownerOf(full);
      var cmd = p.install || "";
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
          cursor: "pointer"
        }
      },
        cover ? h("img", {
          src: cover,
          alt: "",
          style: {
            width: "100%",
            height: hCover,
            objectFit: "cover",
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
              border: "1px solid " + OK,
              color: OK,
              background: BG
            }
          }, "已安装") : null,
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
          h("span", { style: { color: MUTED, fontSize: 12 } }, "stars " + (p.stars || 0))
        ),
        h("div", { style: { color: MUTED, fontSize: 12, marginTop: 4 } },
          (author ? author + " · " : "") + (p.category_zh || p.category || "")
        ),
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
            minHeight: 36
          }
        }, p.description || zh || en || ""),
        cmd ? h("button", {
          type: "button",
          title: "点击复制安装命令",
          onClick: onCopy,
          style: cmdStyle()
        }, copied ? "已复制" : cmd) : null,
        h("div", { style: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" } },
          (!installed) ? h("button", {
            type: "button",
            disabled: waiting || !full,
            onClick: function () { if (install) install(full); },
            style: btnStyle(waiting || !full, true)
          }, waiting ? "安装中…" : "安装") : h("button", {
            type: "button",
            disabled: busyUn || isSelf || !full,
            title: isSelf ? "这是插件库本身" : "卸载此插件",
            onClick: function () { if (uninstall) uninstall(full); },
            style: btnStyle(busyUn || isSelf || !full, false, !isSelf)
          }, busyUn ? "卸载中…" : "卸载"),
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
          style: { marginTop: 8, color: ERR, fontSize: 12 }
        }, p.warning) : null
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
      var listRef = useRef(null);

      function markRestart() {
        writeRestartNeeded(true);
        setRestartNeeded(true);
      }
      function refreshInstalled() {
        fetchInstalled(function (err, list) {
          if (list) setInstalled(list);
        });
      }

      useEffect(function () {
        if (listRef.current) listRef.current.scrollTop = 0;
      }, [page, query, scope, cat, view]);

      useEffect(function () {
        var dead = false;
        fetchUpdateInfo(function (err, info) {
          if (!dead && info) setUpdateInfo(info);
        });
        fetchInstalled(function (err, list) {
          if (!dead && list) setInstalled(list);
        });
        return function () { dead = true; };
      }, []);

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

      var install = useCallback(function (full) {
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
        fetch("/api/dsh-plugins/install", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: full })
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var text = (data && (data.message || data.error || data.stderr)) || (data && data.ok ? "已安装" : "安装失败");
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

      var installedMap = {};
      for (var im = 0; im < installed.length; im++) {
        if (installed[im] && installed[im].full_name) installedMap[installed[im].full_name] = installed[im];
      }

      var matched = [];
      if (view === "installed") {
        for (var i = 0; i < installed.length; i++) {
          var card = cardFromInstalled(installed[i]);
          var q = query || "";
          if (q) {
            var blob = [card.name, card.full_name, card.author].join(" ").toLowerCase();
            if (blob.indexOf(q) < 0) continue;
          }
          matched.push(card);
        }
      } else {
        for (var i = 0; i < plugins.length; i++) {
          if (matchItem(plugins[i], query, scope, cat)) matched.push(plugins[i]);
        }
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
          var row = installedMap[full];
          var cardItem = item;
          if (row && row.warning && !item.warning) {
            cardItem = {};
            for (var ck in item) cardItem[ck] = item[ck];
            cardItem.warning = row.warning;
          }
          cards.push(h(PluginCard, {
            key: full || String(item.rank) + item.name,
            p: cardItem,
            install: install,
            uninstall: uninstall,
            waiting: !!busy[full],
            busyUn: !!busyUn[full],
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
          minHeight: 0,
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
            padding: "12px 14px",
            borderBottom: "1px solid " + LINE,
            flexShrink: 0
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
            }, "已安装 " + installed.length)
          ),
          onClose ? h("button", { type: "button", onClick: onClose, style: btnStyle(false, false) }, "关闭") : null
        ),
        h("div", {
          ref: listRef,
          style: {
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 14px 20px"
          }
        },
          h(RestartBanner, {
            show: restartNeeded,
            onDismiss: function () {
              writeRestartNeeded(false);
              setRestartNeeded(false);
            }
          }),
          h(UpdateBanner, {
            info: updateInfo,
            busy: updating,
            note: updateNote,
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
                  setUpdateNote({ ok: true, text: data.message || ("已更新。" + "请完全退出 dsh-desktop 再打开，插件才会生效。") });
                  setUpdateInfo(function (cur) { return cur ? Object.assign({}, cur, { newer: false }) : cur; });
                  markRestart();
                  refreshInstalled();
                } else {
                  setUpdateNote({ ok: false, text: (data && (data.message || data.error)) || "更新失败" });
                }
              });
            }
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
          (view === "discover" && loading) ? h("div", { style: { color: MUTED } }, "加载目录中…") : null,
          (view === "discover" && error) ? h("div", { style: { color: ERR, marginBottom: 8 } }, error) : null,
          (view === "installed" || (!loading && !error)) ? h("div", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }
          },
            h("div", { style: { color: MUTED } },
              (view === "installed" ? "已安装 " : "共 ") + matched.length + " 个插件 · 第 " + cur + "/" + pages + " 页"
            ),
            matched.length > 0 ? h(Pager, { cur: cur, pages: pages, setPage: setPage }) : null
          ) : null,
          (view === "installed" || !loading) ? h("div", { "data-dsh-plugins-grid": "" }, cards) : null,
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
      useEffect(function () {
        return hideStoreChrome();
      }, []);
      return h("div", {
        "data-dsh-plugins-catalog": "",
        style: {
          height: "100%",
          minHeight: 0,
          width: "100%"
        }
      }, h(CatalogDrawer, { coverSize: coverSize }));
    }

    function ensureRailHost() {
      if (typeof document === "undefined") return null;
      var existing = document.querySelector("[data-dsh-plugins-rail]");
      var workspaces = document.querySelector('[data-slot="sidebar.workspaces"]');
      var sidebar = document.querySelector('[data-slot="sidebar"]');
      if (!existing && !workspaces && !sidebar) return null;
      var host = existing;
      if (!host) {
        host = document.createElement("div");
        host.setAttribute("data-dsh-plugins-rail", "");
        host.style.width = "100%";
        host.style.boxSizing = "border-box";
        host.style.flexShrink = "0";
        host.style.position = "relative";
        host.style.zIndex = "8";
        host.style.pointerEvents = "auto";
      }
      if (workspaces && workspaces.parentNode) {
        if (host.parentNode !== workspaces.parentNode || host.nextSibling !== workspaces) {
          workspaces.parentNode.insertBefore(host, workspaces);
        }
      } else if (sidebar) {
        if (host.parentNode !== sidebar || sidebar.firstChild !== host) {
          sidebar.insertBefore(host, sidebar.firstChild);
        }
      } else {
        return existing || null;
      }
      return host;
    }

    function removeRailHost() {
      if (typeof document === "undefined") return;
      var existing = document.querySelector("[data-dsh-plugins-rail]");
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    }

    function openCatalogView() {
      if (typeof document === "undefined") return false;
      var header = document.querySelector('[data-slot="conversation.session.header"]');
      var roots = [];
      if (header) roots.push(header);
      roots.push(document);
      for (var r = 0; r < roots.length; r++) {
        var nodes = roots[r].querySelectorAll('button, [role="tab"], a, [data-slot]');
        for (var i = 0; i < nodes.length; i++) {
          var b = nodes[i];
          if (b.closest && b.closest("[data-dsh-plugins-rail]")) continue;
          if (b.closest && b.closest('[data-slot="settings.section"]')) continue;
          if (b.closest && b.closest('[data-slot="sidebar.footer.action"]')) continue;
          var label = String(b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
          if (label === "插件" || label === "插件库") {
            try { b.click(); return true; } catch (e) {}
          }
        }
      }
      return false;
    }

    function SidebarStore(props) {
      var ui0 = readLocalUi();
      var sh = useState(ui0.showSidebar);
      var show = sh[0], setShow = sh[1];
      var cs = useState(ui0.coverSize);
      var coverSize = cs[0], setCoverSize = cs[1];
      var hs = useState(null);
      var host = hs[0], setHost = hs[1];
      var nw = useState(false);
      var hasUpdate = nw[0], setHasUpdate = nw[1];

      useEffect(function () {
        function onUp(e) {
          var d = (e && e.detail) || {};
          setHasUpdate(!!d.newer);
        }
        window.addEventListener(UPD_EVT, onUp);
        fetchUpdateInfo(function (err, info) {
          if (info) setHasUpdate(!!info.newer);
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

      useEffect(function () {
        if (show === false) {
          removeRailHost();
          setHost(null);
          return;
        }
        var start = Date.now();
        var timer = null;
        function tick() {
          var node = ensureRailHost();
          if (node) {
            setHost(node);
            return;
          }
          if (Date.now() - start < 10000) {
            timer = setTimeout(tick, 200);
          }
        }
        tick();
        return function () {
          if (timer) clearTimeout(timer);
        };
      }, [show]);

      if (show === false) {
        return null;
      }
      if (!host || !createPortal) return null;

      var btn = h("button", {
        type: "button",
        onClick: function (e) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          openCatalogView();
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 12px",
          border: "none",
          borderRadius: 8,
          background: "transparent",
          color: FG,
          cursor: "pointer",
          fontSize: 14,
          lineHeight: "20px",
          boxSizing: "border-box",
          textAlign: "left",
          pointerEvents: "auto",
          position: "relative",
          zIndex: 8
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

      return createPortal(btn, host);
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
            setStatus("发现新版本 " + (info.latestSha || "") + "（当前 " + (info.current || "-") + "），请点「更新本插件」");
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
            var lines = [];
            lines.push("本插件 " + (self.full_name || "Sakana-yuyu/dsh-plugins") +
              " 当前 " + (self.current || "-") +
              " / 最新 " + (self.latestSha || "-") +
              (self.newer ? " · 有更新" : " · 已是最新"));
            var inst = data.installed || [];
            if (!inst.length) lines.push("未发现已安装的 github: 目录插件");
            else {
              lines.push("已安装 " + inst.length + " 个：");
              for (var i = 0; i < inst.length; i++) {
                lines.push("- " + inst[i].full_name + " (" + inst[i].spec + ")");
              }
            }
            setNewer(!!self.newer);
            setStatusKind(self.newer ? "warn" : "ok");
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
            if (data && data.ok) setNewer(false);
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
            style: { color: BRAND, textDecoration: "none", fontSize: 12 }
          }, "在线目录")
        )
      );
    }

    function apply(ctx) {
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "dsh-plugins",
        order: 20,
        label: () => "插件",
        inject: () => ({}),
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
