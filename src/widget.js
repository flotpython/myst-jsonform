/**
 * Browser-side anywidget renderer for the {jsonform} directive.
 *
 * This file is BUNDLED by esbuild (see package.json) into dist/widget.mjs.
 * Bundling resolves React, react-dom and all @jsonforms/* packages at build
 * time into a single self-contained module — so there is exactly ONE copy of
 * React and one of @jsonforms/core, deterministically. No CDN, no runtime
 * dependency resolution, no esm.sh dep-hash gymnastics.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { JsonForms } from '@jsonforms/react';
import { vanillaRenderers, vanillaCells } from '@jsonforms/vanilla-renderers';

function JsonFormWidget({ schema }) {
  const [data, setData] = React.useState({});
  return React.createElement(JsonForms, {
    schema,
    data,
    renderers: vanillaRenderers,
    cells: vanillaCells,
    onChange: ({ data: next }) => setData(next),
  });
}

function render({ model, el }) {
  const schema = typeof model.get === 'function' ? model.get('schema') : model.schema;
  const root = createRoot(el);
  root.render(React.createElement(JsonFormWidget, { schema }));
  return () => root.unmount();
}

export default { render };
