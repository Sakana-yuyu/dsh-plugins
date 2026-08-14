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
