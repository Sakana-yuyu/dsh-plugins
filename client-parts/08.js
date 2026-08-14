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
            onLater: function () { setShowRestartModal(false); },
            onRestart: function () { setShowRestartModal(false); restartNow(); }
          }),
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
          h("div", { style: { marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("button", {
              type: "button",
              onClick: function () { setView("discover"); setPage(1); },
              style: chipStyle(view === "discover")
            }, "发现"),
            h("button", {
              type: "button",
              onClick: function () { setView("installed"); setPage(1); },
              style: chipStyle(view === "installed")
            }, "已安装"),
            view === "discover" ? h("span", { style: { color: LINE, margin: "0 4px 6px" } }, "|") : null,
            view === "discover" ? chips : null
          ),
          view === "discover" ? h("div", { style: { marginBottom: 10 } }, catChips) : null,
          (view === "discover" && loading) ? h("div", { style: { color: MUTED } }, "加载目录中…") : null,
          (view === "discover" && error) ? h("div", { style: { color: ERR, marginBottom: 8 } }, error) : null,
          (view === "installed" || (!loading && !error)) ? h("div", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }
          },
            h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
              h("div", { style: { color: MUTED } },
                (view === "installed" ? "已安装 " : "共 ") + matched.length + " 个插件 · 第 " + cur + "/" + pages + " 页"
              ),
              view === "installed" ? h("button", {
                type: "button",
                disabled: checking,
                onClick: function () { refreshUpdates(); },
                style: btnStyle(checking, false)
              }, checking ? "检查中…" : "检查更新") : null,
              view === "installed" ? h("button", {
                type: "button",
                disabled: updating || !newerCount,
                onClick: updateAllNow,
                style: btnStyle(updating || !newerCount, true)
              }, updating ? "更新中…" : "全部更新") : null,
              (view === "installed" && newerCount > 0) ? h("span", { style: { color: BRAND, fontWeight: 650, fontSize: 12 } }, newerCount + " 个可更新") : null
            ),
            matched.length > 0 ? h(Pager, { cur: cur, pages: pages, setPage: setPage }) : null
          ) : null,
          (view === "installed" || !loading) ? h("div", { "data-dsh-plugins-grid": "" }, cards) : null,
          ((view === "installed" || (!loading && !error)) && matched.length === 0) ? h("div", { style: { color: MUTED } },
            view === "installed"
              ? (installed.length === 0
                ? "还没有从目录安装过插件。去「发现」里点安装。"
                : "没有匹配的已安装插件")
              : "没有匹配的插件"
          ) : null,
          ((view === "installed" || (!loading && !error)) && matched.length > 0) ? h("div", { style: { marginTop: 14 } },
            h(Pager, { cur: cur, pages: pages, setPage: setPage })
          ) : null
        )
      );
    }

    function CatalogView() {
      var coverSize = readLocalUi().coverSize;
      useEffect(function () {
        return hideStoreChrome();
      }, []);
      return h("div", {
        "data-dsh-plugins-catalog": "",
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
        host.style.position = "relative";
        host.style.zIndex = "8";
        host.style.pointerEvents = "auto";
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
      if (typeof document === "undefined") return false;
      var header = document.querySelector('[data-slot="conversation.session.header"]');
      var roots = [];
      if (header) roots.push(header);
      roots.push(document);
      for (var r = 0; r < roots.length; r++) {
        var nodes = roots[r].querySelectorAll('button, [role="tab"], a, [data-slot]');
        for (var i = 0; i < nodes.length; i++) {
          var b = nodes[i];
          if (b.closest && b.closest("[data-dsh-plugins-rail]")) continue;
          if (b.closest && b.closest('[data-slot="settings.section"]')) continue;
          if (b.closest && b.closest('[data-slot="sidebar.footer.action"]')) continue;
          var label = String(b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
