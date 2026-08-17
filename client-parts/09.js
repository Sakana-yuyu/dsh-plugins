            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid " + LINE,
            flexShrink: 0
          }
        },
          h("div", {
            style: {
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10
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
          )
        ),
        h("div", {
          ref: listRef,
          style: {
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 20px 20px",
            width: "100%",
            boxSizing: "border-box"
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
          (view === "installed" || !loading) ? h("div", {
            "data-dsh-plugins-grid": "",
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 12,
              alignItems: "stretch"
            }
          }, cards) : null,
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
      var os = useState(storeOpen);
      var open = os[0], setOpen = os[1];
      useEffect(function () {
        var un = subscribeStoreOpen(function (v) { setOpen(v); });
        return un;
      }, []);
      useEffect(function () {
        if (open) return hideStoreChrome();
        return;
      }, [open]);
      if (!open) return null;
      // Full-screen opaque page rendered inside the shell.overlay layer. The
      // background is fully opaque so the conversation window is completely
      // hidden while the store is open. It must NOT portal to document.body:
