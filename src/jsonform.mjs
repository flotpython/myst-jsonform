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

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The bundled, self-contained widget produced by `npm run build`.
const WIDGET_PATH = path.resolve(HERE, '..', 'dist', 'widget.mjs');

const jsonformDirective = {
  name: 'jsonform',
  doc: 'Render an interactive form from a JSON Schema.',
  body: { type: String, required: true, doc: 'JSON Schema definition for the form.' },
  run(data, vfile) {
    let schema;
    try {
      schema = JSON.parse(data.body);
    } catch {
      vfile.message('jsonform: body must be valid JSON');
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
