              lineHeight: "20px",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere"
            }
          }, readme) : h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无 README"),
          full ? h("div", { style: { marginTop: 16 } },
            h("button", {
              type: "button",
              onClick: function (e) {
                if (e && e.preventDefault) e.preventDefault();
                if (e && e.stopPropagation) e.stopPropagation();
                openExternal(repoUrl(p) || ("https://github.com/" + full));
              },
              style: btnStyle(false, true)
            }, "在 GitHub 打开")
          ) : null
        ),
        // Close button pinned to the viewport top-right, always visible even
        // while the content box scrolls.
        h("button", {
          type: "button",
          title: "关闭",
          onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); onClose(); },
          style: {
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 10002,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            fontWeight: 600,
            fontSize: 13,
            lineHeight: "20px",
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)"
          }
        }, "✕ 关闭")
      );
      return overlay(node);
    }

    function PluginCard(props) {
      var p = props.p;
      var install = props.install;
      var uninstall = props.uninstall;
      var waiting = props.waiting;
      var busyUn = props.busyUn;
      var installed = !!props.installed;
      var isSelf = !!props.isSelf;
      var note = props.note;
      var onUpdate = props.onUpdate;
      var busyUp = !!props.busyUp;
      var hasUpdate = !!(props.hasUpdate || (p && p.newer));
      var hCover = coverH(props.coverSize);
      var ex = useState(false);
      var open = ex[0], setOpen = ex[1];
      var cp = useState(false);
      var copied = cp[0], setCopied = cp[1];
      var dt = useState(null);
      var detail = dt[0], setDetail = dt[1];
      var full = p.full_name || "";
      var id = p.npm_name || p.name || full;
      var author = p.author || ownerOf(full);
      var cmd = (p.install_method === "link" || p.install === "link") ? "" : (p.install || "");
      var linkOnly = p.install_method === "link" || p.install === "link" || /(^|\/)awesome-dsh-plugins$/i.test(full);
      var cover = full ? ("https://opengraph.githubassets.com/1/" + full) : "";
      function onCopy() {
        if (!cmd) return;
        copyText(cmd).then(function () {
          setCopied(true);
          setTimeout(function () { setCopied(false); }, 1200);
        }).catch(function () {});
      }
      function onOpenDetail() {
        setOpen(true);
        if (!detail && full) {
          setDetail({ loading: true, images: [], readme_zh: "", readme_en: "", error: "" });
          fetch("/api/dsh-plugins/detail?full_name=" + encodeURIComponent(full))
            .then(function (r) { return r.json(); })
            .then(function (data) {
              var imgs = (data && data.images) || [];
              if ((!imgs || !imgs.length) && data && data.og) imgs = [data.og];
              setDetail({
                loading: false,
                images: imgs,
                readme_zh: (data && data.readme_zh) || "",
                readme_en: (data && data.readme_en) || "",
                error: data && data.ok === false ? ((data.error || data.message) || "加载失败") : ""
              });
            })
            .catch(function (e) {
              setDetail({
                loading: false,
                images: [],
                readme_zh: "",
                readme_en: "",
                error: String((e && e.message) || e || "加载失败")
              });
            });
        }
      }
      var zh = p.description_zh || "";
      var en = p.description_en || "";
      return h("div", {
        onClick: function (e) {
          var t = e && e.target;
          if (t && t.closest && t.closest("button, a, input, textarea")) return;
          onOpenDetail();
        },
        style: {
          border: "1px solid " + LINE,
          background: BG,
          borderRadius: 8,
          padding: 10,
          overflow: "hidden",
          maxWidth: "100%",
          boxSizing: "border-box",
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer"
        }
      },
        cover ? h("img", {
          src: cover,
          alt: "",
          style: {
            width: "100%",
            height: "auto",
            maxHeight: hCover || "none",
            aspectRatio: "2 / 1",
            objectFit: "contain",
            objectPosition: "center top",
            background: "rgba(0,0,0,0.06)",
            borderRadius: 6,
            marginBottom: 8,
            display: "block"
          }
        }) : null,
        h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          h("span", { style: { fontWeight: 600, fontSize: 14, color: FG } }, p.name || full),
          installed ? h("span", {
            style: {
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
        linkOnly ? h("div", { style: { color: MUTED, fontSize: 11, marginTop: 2 } }, "这是目录索引，不能当插件安装") : null,
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
          (!installed && !linkOnly) ? h("button", {
            type: "button",
            disabled: waiting || !id,
            onClick: function () { if (install) install(id, p); },
            style: btnStyle(waiting || !id, true)
          }, waiting ? "安装中…" : "安装") : null,
          (installed && hasUpdate && onUpdate) ? h("button", {
