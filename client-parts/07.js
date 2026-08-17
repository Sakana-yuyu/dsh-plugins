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

      var uninstall = useCallback(function (full, item) {
        var target = (item && (item.dep_name || item.npm_name || item.name)) || full;
        var noteKey = (item && item.full_name) || full;
        if (!target || busyUn[target] || busyUn[noteKey]) return;
        setBusyUn(function (b) {
          var n = {};
          for (var k in b) n[k] = b[k];
          n[target] = true;
          n[noteKey] = true;
          return n;
        });
        setNotes(function (m) {
          var n = {};
          for (var k in m) n[k] = m[k];
          delete n[noteKey];
          delete n[full];
          return n;
        });
        fetch("/api/dsh-plugins/uninstall", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: (item && item.full_name) || full, name: target })
        })
