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
  'https://cdn.jsdelivr.net/gh/myst-contrib/myst-jsonform@main/dist/widget.mjs';

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

/**
 * The directive body is one of:
 *   1. a bare JSON Schema, e.g.   `type: object` / `properties: ...`
 *   2. a wrapper with up to three named chunks, mirroring the JSONForms tabs:
 *        Schema:   ...   (required)
 *        UISchema: ...   (optional — auto-generated if omitted)
 *        Data:     ...   (optional — initial form data)
 *
 * Wrapper mode is detected by the presence of a top-level `Schema` key; a bare
 * JSON Schema never has one. Key names are matched case-insensitively and
 * ignoring spaces/underscores, so `UISchema`, `UI Schema`, `ui_schema` all work.
 */
function extractParts(parsed) {
  const byNorm = {};
  for (const key of Object.keys(parsed)) {
    byNorm[key.toLowerCase().replace(/[\s_]+/g, '')] = key;
  }
  if (byNorm.schema) {
    return {
      schema: parsed[byNorm.schema] ?? {},
      uischema: byNorm.uischema ? parsed[byNorm.uischema] : undefined,
      data: byNorm.data ? parsed[byNorm.data] : undefined,
      style: byNorm.style ? parsed[byNorm.style] : undefined,
      submit: byNorm.submit ? parsed[byNorm.submit] : undefined,
    };
  }
  return { schema: parsed, uischema: undefined, data: undefined, style: undefined, submit: undefined };
}

/**
 * A `Style:` value is either a *reference* to a stylesheet (a single-line URL or
 * a path ending in .css) or *inline CSS text*. References go through the
 * anywidget `css` field (staged/downloaded by mystmd, linked into the shadow
 * root by the theme); inline text is injected by the widget as a <style>.
 */
function isCssReference(value) {
  const v = value.trim();
  if (v.includes('\n') || v.includes('{')) return false;
  return /^https?:\/\//i.test(v) || /\.css$/i.test(v);
}

const jsonformDirective = {
  name: 'jsonform',
  doc: 'Render an interactive form from a JSON Schema (optionally with UI Schema and Data).',
  body: { type: String, required: true, doc: 'JSON Schema, or a Schema/UISchema/Data wrapper (YAML or JSON).' },
  run(data, vfile) {
    let parsed;
    try {
      // js-yaml parses YAML; since YAML is a superset of JSON, this also
      // accepts a plain JSON body.
      parsed = loadYaml(data.body);
    } catch (err) {
      vfile.message(`jsonform: body must be valid YAML or JSON (${err.message})`);
      parsed = {};
    }
    if (!parsed || typeof parsed !== 'object') {
      vfile.message('jsonform: body must define a JSON Schema object');
      parsed = {};
    }
    const { schema, uischema, data: formData, style, submit } = extractParts(parsed);
    if (!schema || typeof schema !== 'object') {
      vfile.message('jsonform: Schema must be a JSON Schema object');
    }
    const node = {
      type: 'anywidget',
      esm: widgetRef(vfile.path),
      model: { schema: schema ?? {}, uischema, data: formData, submit },
      id: randomUUID(),
    };
    if (typeof style === 'string' && style.trim()) {
      if (isCssReference(style)) {
        node.css = style.trim(); // file/URL -> staged & linked into the shadow root
      } else {
        node.model.style = style; // inline CSS -> injected by the widget
      }
    }
    return [node];
  },
};

export default {
  name: 'myst-jsonform',
  directives: [jsonformDirective],
};
