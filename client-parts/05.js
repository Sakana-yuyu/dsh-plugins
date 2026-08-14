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
          (!installed) ? h("button", {
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
