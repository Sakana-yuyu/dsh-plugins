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
