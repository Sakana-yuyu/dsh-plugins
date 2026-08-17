            mo.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
          }
        } catch (e) {}
        var mq = null;
        try { mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null; } catch (e) {}
        if (mq && mq.addEventListener) mq.addEventListener("change", update);
        window.addEventListener(EVT, update);
        return function () {
          if (mo) mo.disconnect();
          if (mq && mq.removeEventListener) mq.removeEventListener("change", update);
          window.removeEventListener(EVT, update);
        };
      }, []);

      useEffect(function () {
        var dead = false;
        fetch("/api/dsh-plugins/prefs")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (dead || !data || !data.ok || !data.prefs) return;
            setPrefs(data.prefs);
            writeLocalUi({
              showSidebar: data.prefs.showSidebar !== false,
              coverSize: data.prefs.coverSize
            });
          })
          .catch(function () {});
        return function () { dead = true; };
      }, []);

      useEffect(function () {
        fetchUpdateInfo(function (err, info) {
          if (!info) return;
          setNewer(!!info.newer);
          if (info.newer) {
            setStatusKind("warn");
            setStatus("发现新版本 " + (info.latest || info.latestSha || "") + "（当前 " + (info.current || "-") + "），请点「更新本插件」");
          }
        });
      }, []);

      function patchPrefs(partial) {
        setPrefs(function (p) { return Object.assign({}, p, partial); });
        if (partial.showSidebar !== undefined || partial.coverSize) writeLocalUi(partial);
        fetch("/api/dsh-plugins/prefs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(partial)
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.ok && data.prefs) setPrefs(data.prefs);
          })
          .catch(function () {});
      }

      function checkNow() {
        if (busy) return;
        setBusy(true);
        setStatus("正在检查更新…");
        fetch("/api/dsh-plugins/updates")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data || !data.ok) {
              setStatus((data && (data.error || data.message)) || "检查失败");
              return;
            }
            var self = data.self || {};
            function labelOf(item) {
              if (!item) return "检查失败";
              if (item.status === "error" || item.status === "unknown") return "检查失败";
              if (item.newer) return "有更新";
              if (item.status === "latest") return "已是最新";
              return "检查失败";
            }
            var lines = [];
            lines.push("本插件 " + (self.full_name || "Sakana-yuyu/dsh-plugins") +
              " 当前 " + (self.current || "-") +
              " / 最新 " + (self.latest || self.latestSha || "-") +
              " · " + labelOf(self));
            var inst = data.installed || [];
            if (!inst.length) lines.push("未发现已安装的 github: 目录插件");
            else {
              lines.push("已安装 " + inst.length + " 个：");
              for (var i = 0; i < inst.length; i++) {
                var it = inst[i];
                lines.push("- " + it.full_name + " 当前 " + (it.current || it.version || "-") + " / 最新 " + (it.latest || "-") + " · " + labelOf(it));
              }
            }
            var anyNewer = !!self.newer || !!(data.newerCount);
            var anyErr = self.status === "error" || inst.some(function (x) { return x && x.status === "error"; });
            setNewer(anyNewer);
            setStatusKind(anyNewer ? "warn" : (anyErr ? "err" : "ok"));
            setStatus(lines.join("\n"));
          })
          .catch(function (e) {
            setStatusKind("err");
            setStatus(String((e && e.message) || e || "检查失败"));
          })
          .then(function () { setBusy(false); });
      }

      function postUpdate(target) {
        if (busy) return;
        setBusy(true);
        setStatus(target === "all" ? "正在更新全部…" : "正在更新本插件…");
        fetch("/api/dsh-plugins/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target: target })
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var text;
            if (data && data.ok) text = data.message || "已更新。请完全退出 dsh-desktop 再打开，插件才会生效。";
            else text = (data && (data.message || data.error || data.stderr)) || "更新失败";
            setStatusKind((data && data.ok) ? "ok" : "err");
            if (data && data.ok) {
              setNewer(false);
              writeRestartNeeded(true);
              setShowRestartModal(true);
            }
            setStatus(String(text));
          })
          .catch(function (e) {
            setStatusKind("err");
            setStatus(String((e && e.message) || e || "更新失败"));
          })
          .then(function () { setBusy(false); });
      }

      function toggleRow(label, on, set) {
        return h("label", {
          style: { display: "flex", alignItems: "center", gap: 8, margin: "10px 0", cursor: "pointer", color: dark ? "#f3f4f6" : FG }
        },
          h("input", {
            type: "checkbox",
            checked: !!on,
            onChange: function (e) { set(e.target.checked); }
          }),
          h("span", null, label)
        );
      }

      return h("div", {
        style: {
          padding: "8px 4px 16px",
          color: dark ? "#f3f4f6" : FG,
          fontSize: 13,
          lineHeight: "20px",
          maxWidth: "100%",
          boxSizing: "border-box"
        }
      },
        h("div", { style: { fontSize: 16, fontWeight: 600, marginBottom: 4, color: dark ? "#f3f4f6" : FG } }, "插件库"),
        h(RestartModal, {
          show: showRestartModal,
          onLater: function () { setShowRestartModal(false); },
          onRestart: function () { setShowRestartModal(false); restartNow(); }
        }),
        h("div", { style: { color: dark ? "#9ca3af" : MUTED, marginBottom: 12 } }, "管理侧边栏展示和自动更新"),
        toggleRow("在侧边栏显示插件库", prefs.showSidebar !== false, function (v) { patchPrefs({ showSidebar: v }); }),
        h("div", { style: { margin: "10px 0 6px", color: dark ? "#f3f4f6" : FG } }, "封面大小"),
        h("div", { style: { marginBottom: 10 } },
          h("button", {
            type: "button",
            onClick: function () { patchPrefs({ coverSize: "large" }); },
            style: chipStyle(prefs.coverSize !== "medium")
          }, "大图"),
          h("button", {
            type: "button",
            onClick: function () { patchPrefs({ coverSize: "medium" }); },
            style: chipStyle(prefs.coverSize === "medium")
          }, "中图")
        ),
        toggleRow("自动更新本目录插件", !!prefs.autoUpdateSelf, function (v) { patchPrefs({ autoUpdateSelf: v }); }),
        toggleRow("自动更新已安装的目录插件", !!prefs.autoUpdateOthers, function (v) { patchPrefs({ autoUpdateOthers: v }); }),
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 } },
          h("button", { type: "button", disabled: busy, onClick: checkNow, style: btnStyle(busy, true) }, "立即检查更新"),
          h("button", { type: "button", disabled: busy, onClick: function () { postUpdate("self"); }, style: btnStyle(busy, false) }, "更新本插件"),
          h("button", { type: "button", disabled: busy, onClick: function () { postUpdate("all"); }, style: btnStyle(busy, false) }, "更新全部")
        ),
        newer ? h("div", {
          style: {
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid " + BRAND,
            color: BRAND,
            fontWeight: 650
          }
        }, "有可用更新，请点「更新本插件」，完成后请完全退出 dsh-desktop 再打开") : null,
        status ? h("div", {
          style: {
            marginTop: 10,
