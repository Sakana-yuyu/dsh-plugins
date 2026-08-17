          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var text = (data && (data.message || data.error || data.stderr)) || (data && data.ok ? "已卸载" : "卸载失败");
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[noteKey] = { ok: !!(data && data.ok), text: String(text) };
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
              n[noteKey] = { ok: false, text: String((e && e.message) || e || "卸载失败") };
              return n;
            });
          })
          .then(function () {
            setBusyUn(function (b) {
              var n = {};
              for (var k in b) if (k !== target && k !== noteKey && k !== full) n[k] = b[k];
              return n;
            });
          });
      }, [busyUn]);

      var toggle = useCallback(function (row) {
        if (!row || busyUn[row.name] || busyUn[row.entryId]) return;
        var key = row.name || row.entryId;
        var next = !(row.enabled !== false);
        setBusyUn(function (b) {
          var n = {};
          for (var k in b) n[k] = b[k];
          n[key] = true;
          return n;
        });
        setNotes(function (m) {
          var n = {};
          for (var k in m) n[k] = m[k];
          delete n[key];
          return n;
        });
        fetch("/api/dsh-plugins/toggle", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: row.full_name || row.name, name: row.name, enabled: next })
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var text = (data && (data.message || data.error)) || (data && data.ok ? (next ? "已启用" : "已禁用") : "操作失败");
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[key] = { ok: !!(data && data.ok), text: String(text) };
              return n;
            });
            if (data && data.ok && data.needsRestart) {
              markRestart();
            }
            refreshInstalled();
          })
          .catch(function (e) {
            setNotes(function (m) {
              var n = {};
              for (var k in m) n[k] = m[k];
              n[key] = { ok: false, text: String((e && e.message) || e || "操作失败") };
              return n;
            });
          })
          .then(function () {
            setBusyUn(function (b) {
              var n = {};
              for (var k in b) if (k !== key) n[k] = b[k];
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
            if (row.name && !cardItem.dep_name) cardItem.dep_name = row.name;
            if (row.placeholder) {
              cardItem.placeholder = true;
              cardItem.newer = false;
            }
            if (row.warning && !item.warning) cardItem.warning = row.warning;
            if (row.issues_url) cardItem.issues_url = row.issues_url;
            if (row.usable === false) cardItem.usable = false;
            if (row.newer && !row.placeholder) cardItem.newer = true;
            if (row.current || row.version) cardItem.current = row.current || row.version;
            if (row.latest) cardItem.latest = row.latest;
            if (row.status) cardItem.status = row.status;
            if (row.entryId) cardItem.entryId = row.entryId;
            if (row.enabled !== undefined) cardItem.enabled = row.enabled !== false;
            if (row.toggleable !== undefined) cardItem.toggleable = !!row.toggleable;
          }
          cards.push(h(PluginCard, {
            key: id || full || String(item.rank) + item.name,
            p: cardItem,
            install: install,
