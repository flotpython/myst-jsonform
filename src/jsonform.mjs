/**
 * MyST plugin defining the {jsonform} directive.
 *
 * This file runs at BUILD TIME in Node only. It does not touch React.
 * The browser-side rendering lives in the bundled widget at dist/widget.mjs,
 * which the directive references via the anywidget `esm` field.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { load as loadYaml } from 'js-yaml';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The bundled, self-contained widget produced by `npm run build`.
const WIDGET_PATH = path.resolve(HERE, '..', 'dist', 'widget.mjs');

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
      // Path to the bundled widget, relative to the source document. The mystmd
      // anywidget transform copies it into the site's public folder.
      esm: path.relative(path.dirname(vfile.path), WIDGET_PATH),
      model: { schema },
      id: randomUUID(),
    }];
  },
};

export default {
  name: 'myst-jsonform',
  directives: [jsonformDirective],
};
