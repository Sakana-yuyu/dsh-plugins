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
            waiting: !!busy[id] || !!busy[full],
            busyUn: !!busyUn[id] || !!busyUn[full],
            busyUp: !!busyUp[id] || !!busyUp[full],
            hasUpdate: !!(cardItem.newer || (row && row.newer)),
            onUpdate: updateOne,
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
            }, "已安装 " + installed.length + (newerCount ? " · " + newerCount + " 个可更新" : ""))
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
          (function () {
            var broken = installed.filter(function (x) { return x && x.warning; });
            if (!broken.length) return null;
            return h("div", {
              style: {
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid " + ERR,
                color: ERR,
                fontSize: 12,
                lineHeight: "18px"
              }
            }, broken.length + " 个无法加载，请联系对应插件作者");
          })(),
          h(UpdateBanner, {
            info: updateInfo,
            busy: updating,
            note: updateNote,
            onRetry: function () { refreshUpdates(); },
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
                  setUpdateNote(null);
                  setUpdateInfo(function (cur) { return cur ? Object.assign({}, cur, { newer: false }) : cur; });
                  afterUpdateOk();
                } else {
                  setUpdateNote({ ok: false, text: (data && (data.message || data.error)) || "更新失败" });
                }
              });
            }
          }),
          h(RestartModal, {
            show: showRestartModal,
