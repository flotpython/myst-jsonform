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

/**
 * Compact stylesheet for @jsonforms/vanilla-renderers, which ships no CSS of
 * its own. It targets the class names those renderers emit (.vertical-layout,
 * .control, .input, .validation, ...). Injected into the widget's shadow root,
 * so it is automatically scoped — it neither leaks onto the page nor is
 * affected by the host theme's styles.
 */
const STYLE = `
.myst-jsonform { max-width: 32rem; font-size: 0.95rem; }
.myst-jsonform .vertical-layout { display: flex; flex-direction: column; gap: 0.85rem; }
.myst-jsonform .control { display: flex; flex-direction: column; gap: 0.25rem; }
.myst-jsonform .control > label { font-weight: 600; }
.myst-jsonform .control .input,
.myst-jsonform .control input,
.myst-jsonform .control select,
.myst-jsonform .control textarea {
  padding: 0.45rem 0.55rem;
  border: 1px solid #c9ced6;
  border-radius: 5px;
  font: inherit;
  background: #fff;
  color: #111;
  width: 100%;
  box-sizing: border-box;
}
.myst-jsonform .control input[type="checkbox"] { width: auto; }
.myst-jsonform .control .input:focus,
.myst-jsonform .control input:focus,
.myst-jsonform .control select:focus,
.myst-jsonform .control textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.25);
}
.myst-jsonform .control > .input-description { font-size: 0.8rem; color: #6b7280; }
.myst-jsonform .control > .validation { font-size: 0.8rem; color: #d6336c; }
.myst-jsonform .control.validation_error .input,
.myst-jsonform .control.validation_error input,
.myst-jsonform .control.validation_error select,
.myst-jsonform .control.validation_error textarea { border-color: #d6336c; }
.myst-jsonform-actions { margin-top: 1rem; display: flex; align-items: center; gap: 0.75rem; }
.myst-jsonform-submit {
  padding: 0.5rem 1.2rem;
  background: #4a90e2;
  color: #fff;
  border: none;
  border-radius: 5px;
  font: inherit;
  cursor: pointer;
}
.myst-jsonform-submit:hover { background: #3b7dd0; }
.myst-jsonform-submit:disabled { background: #b9c4d2; cursor: not-allowed; }
.myst-jsonform-invalid { font-size: 0.85rem; color: #d6336c; }
.myst-jsonform-result {
  margin-top: 0.85rem;
  padding: 0.7rem 0.85rem;
  background: #f4f6f9;
  border: 1px solid #e1e6ec;
  border-radius: 5px;
  font-size: 0.85rem;
  white-space: pre-wrap;
  overflow-x: auto;
}
`;

function JsonFormWidget({ schema }) {
  const [data, setData] = React.useState({});
  const [errors, setErrors] = React.useState([]);
  const [submitted, setSubmitted] = React.useState(null);

  const isValid = errors.length === 0;

  return React.createElement(
    'div',
    { className: 'myst-jsonform' },
    React.createElement('style', null, STYLE),
    React.createElement(JsonForms, {
      schema,
      data,
      renderers: vanillaRenderers,
      cells: vanillaCells,
      onChange: ({ data: next, errors: errs }) => {
        setData(next);
        setErrors(errs ?? []);
      },
    }),
    React.createElement(
      'div',
      { className: 'myst-jsonform-actions' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'myst-jsonform-submit',
          disabled: !isValid,
          onClick: () => setSubmitted(data),
        },
        'Submit',
      ),
      !isValid &&
        React.createElement(
          'span',
          { className: 'myst-jsonform-invalid' },
          `${errors.length} field(s) need attention`,
        ),
    ),
    submitted &&
      React.createElement(
        'pre',
        { className: 'myst-jsonform-result' },
        JSON.stringify(submitted, null, 2),
      ),
  );
}

function render({ model, el }) {
  const schema = typeof model.get === 'function' ? model.get('schema') : model.schema;
  const root = createRoot(el);
  root.render(React.createElement(JsonFormWidget, { schema }));
  return () => root.unmount();
}

export default { render };
