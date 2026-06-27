/**
 * MyST plugin defining the {jsonform} directive.
 *
 * This file runs at BUILD TIME in Node only. It does not touch React.
 * The browser-side rendering lives in the bundled widget (dist/widget.mjs),
 * which the directive references via the anywidget `esm` field.
 *
 * It is itself bundled (with js-yaml inlined) into dist/jsonform.mjs so it can
 * be loaded directly from a URL — see `bun run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { load as loadYaml } from 'js-yaml';

// Published location of the browser widget bundle (used when this plugin is
// loaded from a URL, i.e. there is no local checkout next to it).
const WIDGET_URL =
  'https://cdn.jsdelivr.net/gh/flotpython/myst-jsonform@main/dist/widget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Local widget bundle, relative to this file. Present in a checkout (whether
// this file is src/jsonform.mjs or the bundled dist/jsonform.mjs); absent when
// the plugin was downloaded from a URL into a temp dir.
const LOCAL_WIDGET = path.resolve(HERE, '..', 'dist', 'widget.mjs');

/**
 * Resolve the anywidget `esm` reference for a given source document:
 *   - local checkout  -> a filesystem path relative to the document
 *   - loaded by URL   -> the published jsDelivr URL
 * In both cases the mystmd anywidget transform stages the file into /public.
 */
function widgetRef(vfilePath) {
  if (fs.existsSync(LOCAL_WIDGET)) {
    return path.relative(path.dirname(vfilePath), LOCAL_WIDGET);
  }
  return WIDGET_URL;
}

const jsonformDirective = {
  name: 'jsonform',
  doc: 'Render an interactive form from a JSON Schema.',
  body: { type: String, required: true, doc: 'JSON Schema for the form (YAML or JSON).' },
  run(data, vfile) {
    let schema;
    try {
      // js-yaml parses YAML; since YAML is a superset of JSON, this also
      // accepts a plain JSON body.
      schema = loadYaml(data.body);
    } catch (err) {
      vfile.message(`jsonform: body must be valid YAML or JSON (${err.message})`);
      schema = {};
    }
    if (!schema || typeof schema !== 'object') {
      vfile.message('jsonform: body must define a JSON Schema object');
      schema = {};
    }
    return [{
      type: 'anywidget',
      esm: widgetRef(vfile.path),
      model: { schema },
      id: randomUUID(),
    }];
  },
};

export default {
  name: 'myst-jsonform',
  directives: [jsonformDirective],
};
