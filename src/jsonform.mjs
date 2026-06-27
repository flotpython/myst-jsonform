// pathMod is only needed at build time (Node). Guard the import so the browser
// never tries to fetch "node:path" as a URL (which triggers a CORS error).
let pathMod;
if (typeof window === "undefined") {
  try { pathMod = await import("node:path"); } catch {}
}

const PLUGIN_PATH = new URL(import.meta.url).pathname;

// The host theme passes React and ReactDOM, but @jsonforms/react (loaded from
// esm.sh) uses its own internal React instance for hooks. Mixing the host's
// ReactDOM.createRoot with esm.sh hooks causes a dispatcher mismatch. So we
// import React/ReactDOM from esm.sh too, and pin all @jsonforms deps to the
// same React URL via ?deps= so the browser module cache deduplicates them.
async function render({ model, el }) {
  const schema = typeof model.get === "function" ? model.get("schema") : model.schema;

  try {
    const [{ default: React }, { createRoot }] = await Promise.all([
      import("https://esm.sh/react@18"),
      import("https://esm.sh/react-dom@18/client"),
    ]);

    // React.lazy defers @jsonforms module evaluation until we are inside a
    // React render, ensuring any module-level hook calls have a valid dispatcher.
    const LazyForm = React.lazy(async () => {
      // The @jsonforms packages share peerDependencies that MUST resolve to one
      // copy each, pinned to the EXACT same version, or things break:
      //   - @jsonforms/core   -> renderer "testers" won't match the dispatcher
      //   - @jsonforms/react  -> renderers can't read the <JsonForms> React
      //                          context ("No applicable renderer found")
      // esm.sh's ?deps= routes these to shared URLs so the browser dedupes them.
      // NB: do NOT list react-dom here. @jsonforms/react does not depend on
      // react-dom, and including it changes the esm.sh dep-hash so that our
      // direct @jsonforms/react copy no longer matches the one vanilla-renderers
      // imports internally -> two React contexts -> "No applicable renderer
      // found". These deps strings are crafted to make all @jsonforms/react and
      // @jsonforms/core resolutions land on byte-identical URLs.
      const V = "3.8.0";
      const jsonReactDeps = `react@18,@jsonforms/core@${V}`;
      const vanillaDeps = `${jsonReactDeps},@jsonforms/react@${V}`;
      const [{ JsonForms }, { vanillaRenderers, vanillaCells }] = await Promise.all([
        import(`https://esm.sh/@jsonforms/react@${V}?deps=${jsonReactDeps}`),
        import(`https://esm.sh/@jsonforms/vanilla-renderers@${V}?deps=${vanillaDeps}`),
      ]);
      return {
        default: function JsonFormWidget() {
          const [data, setData] = React.useState({});
          return React.createElement(JsonForms, {
            schema,
            data,
            renderers: vanillaRenderers,
            cells: vanillaCells,
            onChange: ({ data: next }) => setData(next),
          });
        },
      };
    });

    const root = createRoot(el);
    root.render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("span", null, "Loading form…") },
        React.createElement(LazyForm),
      ),
    );
    return () => root.unmount();
  } catch (err) {
    console.error("[myst-jsonform]", err);
    const pre = document.createElement("pre");
    pre.style.cssText = "color:red;font-size:0.75rem;white-space:pre-wrap";
    pre.textContent = String(err);
    el.appendChild(pre);
  }
}

const jsonformDirective = {
  name: "jsonform",
  doc: "Render an interactive form from a JSON Schema.",
  body: { type: String, required: true },
  run(data, vfile) {
    let schema;
    try {
      schema = JSON.parse(data.body);
    } catch {
      vfile.message("jsonform: body must be valid JSON");
      schema = {};
    }
    return [{
      type: "anywidget",
      esm: pathMod.relative(pathMod.dirname(vfile.path), PLUGIN_PATH),
      model: { schema },
      id: crypto.randomUUID(),
    }];
  },
};

export default {
  name: "myst-jsonform",
  directives: [jsonformDirective],
  render,
};
