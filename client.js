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
    var SITE = "https://sakana-yuyu.github.io/dsh-plugins/";

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
    function excerpt(s) {
      s = String(s || "").replace(/\r\n/g, "\n").trim();
      if (s.length > 800) s = s.slice(0, 800) + "…";
      return s;
    }
    function coverH(size) {
      return size === "medium" ? 110 : 168;
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
    function btnStyle(disabled, primary) {
      return {
        padding: "6px 12px",
        borderRadius: 6,
        border: "1px solid " + (primary && !disabled ? BRAND : LINE),
        background: BG,
        color: disabled ? MUTED : (primary ? BRAND : FG),
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

    function PluginCard(props) {
      var p = props.p;
      var install = props.install;
      var waiting = props.waiting;
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
      function onToggleDetail() {
        var next = !open;
        setOpen(next);
        if (next && !detail && full) {
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
      var imgs = (detail && detail.images) || [];
      if (imgs.length > 8) imgs = imgs.slice(0, 8);
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
              maxHeight: 200,
              height: 200,
              width: "auto",
              objectFit: "cover",
              borderRadius: 8,
              display: "block"
            }
          })));
        })(imgs[ii], ii);
      }
      var readmeText = excerpt((detail && (detail.readme_zh || detail.readme_en)) || "");
      return h("div", {
        style: {
          border: "1px solid " + LINE,
          background: BG,
          borderRadius: 8,
          padding: 12,
          marginBottom: 10,
          overflowX: "hidden",
          maxWidth: "100%",
          boxSizing: "border-box"
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
        h("div", { style: { marginTop: 6, color: FG } }, p.description || zh || en || ""),
        cmd ? h("button", {
          type: "button",
          title: "点击复制安装命令",
          onClick: onCopy,
          style: cmdStyle()
        }, copied ? "已复制" : cmd) : null,
        h("div", { style: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" } },
          h("button", {
            type: "button",
            disabled: waiting || !full,
            onClick: function () { install(full); },
            style: btnStyle(waiting || !full, true)
          }, waiting ? "安装中…" : "安装"),
          h("button", {
            type: "button",
            onClick: onToggleDetail,
            style: btnStyle(false, false)
          }, open ? "收起" : "详情")
        ),
        open ? h("div", { style: { marginTop: 8, color: MUTED, fontSize: 12, overflowX: "hidden" } },
          (detail && detail.loading) ? h("div", { style: { marginBottom: 8 } }, "正在加载 README…") : null,
          (detail && detail.error) ? h("div", { style: { color: ERR, marginBottom: 8 } }, detail.error) : null,
          shot.length ? h("div", {
            style: {
              display: "flex",
              flexWrap: "nowrap",
              gap: 8,
              overflowX: "auto",
              marginBottom: 8,
              maxHeight: 200
            }
          }, shot) : null,
          zh ? h("div", { style: { marginBottom: 4, color: FG } }, "中文：" + zh) : null,
          en ? h("div", { style: { marginBottom: 4, color: FG } }, "EN: " + en) : null,
          readmeText ? h("div", {
            style: { color: MUTED, whiteSpace: "pre-wrap", overflow: "hidden", marginTop: 6 }
          }, readmeText) : null
        ) : null,
        note ? h("div", {
          style: { marginTop: 8, color: note.ok ? OK : ERR, fontSize: 12 }
        }, note.text) : null
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
            var text;
            if (data && data.ok && data.launched) text = data.message || "已打开 PowerShell 安装窗口，完成后请重启 DSH";
            else if (data && data.ok) text = data.message || (data.needsRestart ? "已安装，请重启 dsh web" : "已安装");
            else text = (data && (data.message || data.error || data.stderr)) || "安装失败";
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[full] = { ok: !!(data && data.ok), text: String(text) };
              return n;
            });
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

      var matched = [];
      for (var i = 0; i < plugins.length; i++) {
        if (matchItem(plugins[i], query, scope, cat)) matched.push(plugins[i]);
      }
      var pageSize = 10;
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
          cards.push(h(PluginCard, {
            key: full || String(item.rank) + item.name,
            p: item,
            install: install,
            waiting: !!busy[full],
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
          h("div", { style: { fontSize: 16, fontWeight: 600, color: FG } }, "插件库"),
          onClose ? h("button", { type: "button", onClick: onClose, style: btnStyle(false, false) }, "关闭") : null
        ),
        h("div", {
          style: {
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 14px 20px"
          }
        },
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
          h("div", { style: { marginBottom: 6 } }, chips),
          h("div", { style: { marginBottom: 10 } }, catChips),
          loading ? h("div", { style: { color: MUTED } }, "加载目录中…") : null,
          error ? h("div", { style: { color: ERR, marginBottom: 8 } }, error) : null,
          (!loading && !error) ? h("div", { style: { color: MUTED, marginBottom: 8 } },
            "共 " + matched.length + " 个插件 · 第 " + cur + "/" + pages + " 页"
          ) : null,
          cards,
          (!loading && !error && matched.length === 0) ? h("div", { style: { color: MUTED } }, "没有匹配的插件") : null,
          (!loading && !error && matched.length > 0) ? h("div", {
            style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }
          },
            h("button", {
              type: "button",
              disabled: cur <= 1,
              onClick: function () { setPage(cur - 1); },
              style: btnStyle(cur <= 1, false)
            }, "上一页"),
            h("span", { style: { color: MUTED, fontSize: 12 } }, cur + " / " + pages),
            h("button", {
              type: "button",
              disabled: cur >= pages,
              onClick: function () { setPage(cur + 1); },
              style: btnStyle(cur >= pages, false)
            }, "下一页")
          ) : null
        )
      );
    }

    function CatalogView() {
      var coverSize = readLocalUi().coverSize;
      return h("div", {
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
      if (typeof document === "undefined") return;
      var root = document.querySelector('[data-slot="conversation.session.header"]') || document;
      var buttons = root.querySelectorAll("button");
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        if (b.closest && b.closest("[data-dsh-plugins-rail]")) continue;
        if (String(b.textContent || "").trim() === "插件库") {
          b.click();
          return;
        }
      }
    }

    function SidebarStore(props) {
      var ui0 = readLocalUi();
      var sh = useState(ui0.showSidebar);
      var show = sh[0], setShow = sh[1];
      var cs = useState(ui0.coverSize);
      var coverSize = cs[0], setCoverSize = cs[1];
      var hs = useState(null);
      var host = hs[0], setHost = hs[1];

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

      var wide = !!(props && props.wide);
      var btn = h("button", {
        type: "button",
        onClick: function () { openCatalogView(); },
        style: {
          width: "100%",
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid " + LINE,
          background: BG,
          color: FG,
          cursor: "pointer",
          fontSize: wide ? 13 : 12,
          lineHeight: "18px",
          boxSizing: "border-box",
          textAlign: "left"
        }
      }, wide ? "插件库" : "库");

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
            setStatus(lines.join("\n"));
          })
          .catch(function (e) {
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
            if (data && data.ok && data.launched) text = data.message || "已打开 PowerShell 更新窗口，完成后请重启 DSH";
            else if (data && data.ok) text = data.message || "已更新，请重启 DSH";
            else text = (data && (data.message || data.error || data.stderr)) || "更新失败";
            setStatus(String(text));
          })
          .catch(function (e) {
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
        status ? h("div", {
          style: {
            marginTop: 10,
            color: MUTED,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            lineHeight: "18px"
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
        label: () => "插件库",
        inject: () => ({}),
      }, CatalogView));
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "dsh-plugins-catalog",
        order: 40,
        label: () => "插件库",
        inject: () => ({}),
      }, SidebarStore));
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-plugins-catalog",
        order: 55,
        label: () => "插件库",
        inject: () => ({}),
      }, SettingsManage));
    }

    exports.name = "dsh-plugins-catalog-client";
    exports.inject = ["slots"];
    exports.apply = apply;
    return module.exports;
  }
});
