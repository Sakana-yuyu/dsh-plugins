window.__ModuleLoader__.load({
  id: "dsh-plugins-catalog",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var ready = null;
    var waiters = [];
    fetch("/api/dsh-plugins/ui.js", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("ui.js " + r.status);
        return r.text();
      })
      .then(function (code) {
        var fn = new Function("require", "module", "exports", code + "\nreturn module.exports;");
        var impl = fn(require, module, exports);
        ready = (impl && impl.apply) ? impl : module.exports;
        for (var i = 0; i < waiters.length; i++) waiters[i]();
        waiters = [];
      })
      .catch(function (err) {
        console.error("[dsh-plugins-catalog] load ui", err);
      });
    function apply(ctx) {
      function go() {
        if (ready && typeof ready.apply === "function") ready.apply(ctx);
      }
      if (ready) go();
      else waiters.push(go);
    }
    return {
      name: "dsh-plugins-catalog-client",
      inject: ["slots"],
      apply: apply
    };
  }
});
