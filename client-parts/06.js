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
