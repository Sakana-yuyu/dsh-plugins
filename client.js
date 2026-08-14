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
    function wrapStyle() {
      return {
        padding: "8px 4px 16px",
        color: FG,
        fontSize: 13,
        lineHeight: "20px",
        overflowX: "hidden",
        maxWidth: "100%",
        boxSizing: "border-box"
      };
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
        overflowX: "hidden",
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

    function PluginCard(props) {
      var p = props.p;
      var install = props.install;
      var waiting = props.waiting;
      var note = props.note;
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
            style: { display: "block", maxWidth: "100%" }
          }, h("img", {
            src: src,
            alt: "",
            style: {
              maxWidth: "100%",
              maxHeight: 180,
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
            height: 88,
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
          h("span", { style: { color: MUTED, fontSize: 12 } }, "★ " + (p.stars || 0))
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
            style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }
          }, shot) : null,
          zh ? h("div", { style: { marginBottom: 4, color: FG } }, "中文：" + zh) : null,
          en ? h("div", { style: { marginBottom: 4, color: FG } }, "EN: " + en) : null,
          readmeText ? h("div", {
            style: {
              color: MUTED,
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              marginTop: 6
            }
          }, readmeText) : null
        ) : null,
        note ? h("div", {
          style: { marginTop: 8, color: note.ok ? OK : ERR, fontSize: 12 }
        }, note.text) : null
      );
    }

    function CatalogPanel() {
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
            note: notes[full]
          }));
        })(shown[j]);
      }

      return h("div", { style: wrapStyle() },
        h("div", { style: { fontSize: 16, fontWeight: 600, marginBottom: 4, color: FG } }, "插件库"),
        h("div", { style: { color: MUTED, marginBottom: 12 } }, "从 Sakana-yuyu/dsh-plugins 目录一键安装"),
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
      );
    }

    function apply(ctx) {
      ctx.slots.inject("settings.section", () =>
        ctx.slots.register({
          name: "settings.section",
          id: "dsh-plugins-catalog",
          order: 55,
          label: () => "插件库",
          inject: () => ({}),
        }, CatalogPanel));
    }

    exports.name = "dsh-plugins-catalog-client";
    exports.inject = ["slots"];
    exports.apply = apply;
    return module.exports;
  }
});
