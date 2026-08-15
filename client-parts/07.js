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
