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
import { createAjv } from '@jsonforms/core';
import { vanillaRenderers, vanillaCells } from '@jsonforms/vanilla-renderers';
import ajvErrors from 'ajv-errors';

// A single shared ajv, configured like JSONForms' default (allErrors, formats)
// plus the ajv-errors plugin. This lets a schema supply its own `errorMessage`,
// replacing ajv's raw defaults ("must match pattern ...") with legible text and
// collapsing multiple keyword errors on one field into a single message.
const ajv = ajvErrors(createAjv());

/**
 * Base stylesheet for @jsonforms/vanilla-renderers, which ships no CSS of its
 * own. It targets the class names those renderers emit (.vertical-layout,
 * .control, .input, ...). Injected into the widget's shadow root, so it is
 * automatically scoped — selectors need no wrapper prefix, and the rules
 * neither leak onto the page nor are affected by the host theme.
 *
 * Theming knobs are exposed as CSS custom properties: because inherited
 * properties cross the shadow boundary, a page can override them with ordinary
 * site CSS, e.g.  :root { --jsonform-accent: #c0392b }
 */
const STYLE = `
.myst-jsonform {
  max-width: var(--jsonform-max-width, 32rem);
  font-size: var(--jsonform-font-size, 0.95rem);
  font-family: var(--jsonform-font-family, inherit);
  color: var(--jsonform-fg, #111);
  margin-bottom: 1.75rem;
}
.vertical-layout { display: flex; flex-direction: column; gap: var(--jsonform-gap, 0.85rem); }
.horizontal-layout { display: flex; flex-direction: row; gap: var(--jsonform-gap, 0.85rem); align-items: flex-start; }
.horizontal-layout > * { flex: 1; }
.control { display: flex; flex-direction: column; gap: 0.25rem; }
.control > label { font-weight: var(--jsonform-label-weight, 600); }
.control .input,
.control input,
.control select,
.control textarea {
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--jsonform-border, #c9ced6);
  border-radius: var(--jsonform-radius, 5px);
  font: inherit;
  background: var(--jsonform-input-bg, #fff);
  color: var(--jsonform-fg, #111);
  width: 100%;
  box-sizing: border-box;
}
.control input[type="checkbox"] { width: auto; }
.control .input:focus,
.control input:focus,
.control select:focus,
.control textarea:focus {
  outline: none;
  border-color: var(--jsonform-accent, #4a90e2);
  box-shadow: 0 0 0 2px var(--jsonform-focus-ring, rgba(74, 144, 226, 0.25));
}
/* The vanilla control reuses one div for both: it has class "validation" plus
   "input-description" when valid (shows the description) or "validation_error"
   when invalid (shows the error). So default it to muted and only redden the
   error state. The input itself gains an "invalid" class when it fails. */
.control > .validation { font-size: 0.8rem; color: var(--jsonform-muted, #6b7280); }
.control > .input-description { font-size: 0.8rem; color: var(--jsonform-muted, #6b7280); }
.control > .validation.validation_error { color: var(--jsonform-error, #d6336c); }
.control input.invalid,
.control select.invalid,
.control textarea.invalid { border-color: var(--jsonform-error, #d6336c); }

/* Array controls (lists of objects / enum checkboxes) */
button {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--jsonform-border, #c9ced6);
  border-radius: var(--jsonform-radius, 5px);
  background: var(--jsonform-modest-bg, #f4f6f9);
  color: var(--jsonform-fg, #111);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
button:hover { background: var(--jsonform-modest-bg-hover, #e7ebf1); }
.array-table-layout > header,
.array-control-layout > header,
.array-layout > legend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.65rem 0;
  padding: 0;
}
.array-table-layout header label,
.array-control-layout header label,
.array-layout > legend > label {
  flex: 1;
  font-weight: var(--jsonform-label-weight, 600);
  margin: 0;
}
.array-layout,
.group-layout {
  border: 1px solid var(--jsonform-border, #c9ced6);
  border-radius: 6px;
  padding: 0.85rem;
  margin: 0.25rem 0;
}
.group-layout > legend { font-weight: var(--jsonform-label-weight, 600); padding: 0 0.35rem; }
.array-table-layout table { width: 100%; border-collapse: collapse; margin-top: 0.25rem; }
.array-table-layout th {
  text-align: left;
  font-size: 0.8rem;
  color: var(--jsonform-muted, #6b7280);
  font-weight: 600;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--jsonform-border, #c9ced6);
}
.array-table-layout td { padding: 0.4rem 0.5rem; vertical-align: top; }

.myst-jsonform-actions { margin-top: 1rem; display: flex; align-items: center; gap: 0.75rem; }
.myst-jsonform-submit {
  padding: 0.5rem 1.2rem;
  background: var(--jsonform-accent, #4a90e2);
  color: var(--jsonform-accent-fg, #fff);
  border: none;
  border-radius: var(--jsonform-radius, 5px);
  font: inherit;
  cursor: pointer;
}
.myst-jsonform-submit:hover { background: var(--jsonform-accent-hover, #3b7dd0); }
.myst-jsonform-submit:disabled { background: #b9c4d2; cursor: not-allowed; }
.myst-jsonform-invalid { font-size: 0.85rem; color: var(--jsonform-error, #d6336c); }
.myst-jsonform-result {
  margin-top: 0.85rem;
  padding: 0.7rem 0.85rem;
  background: var(--jsonform-modest-bg, #f4f6f9);
  border: 1px solid #e1e6ec;
  border-radius: 5px;
  font-size: 0.85rem;
  white-space: pre-wrap;
  overflow-x: auto;
}
`;

function JsonFormWidget({ schema, uischema, initialData, userStyle }) {
  const [data, setData] = React.useState(initialData ?? {});
  const [errors, setErrors] = React.useState([]);
  const [submitted, setSubmitted] = React.useState(null);

  const isValid = errors.length === 0;
  // One field can raise several errors (e.g. both `pattern` and `format`), so
  // count distinct fields, not raw errors. `required` errors report on the
  // parent object, so key them by the missing property instead.
  const fieldKey = (e) =>
    e.instancePath || (e.params?.missingProperty ? `/${e.params.missingProperty}` : '');
  const invalidCount = new Set(errors.map(fieldKey)).size;

  return React.createElement(
    'div',
    { className: 'myst-jsonform' },
    React.createElement('style', null, STYLE),
    // User CSS goes AFTER the base stylesheet so equal-specificity rules win.
    userStyle && React.createElement('style', null, userStyle),
    React.createElement(JsonForms, {
      schema,
      // undefined uischema => JSONForms auto-generates a layout from the schema
      uischema,
      data,
      renderers: vanillaRenderers,
      cells: vanillaCells,
      ajv,
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
          `${invalidCount} field(s) need attention`,
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
  const get = (k) => (typeof model.get === 'function' ? model.get(k) : model[k]);
  // Render into a child, NOT directly into `el`: React's createRoot clears its
  // container, which would wipe out the <link> the theme appends for `node.css`
  // (the `Style:` file/URL reference). Insert the mount as the FIRST child so
  // that <link> stays a sibling AND lands after our base <style> in document
  // order — otherwise the base stylesheet would win the cascade over the user's
  // referenced file for equal-specificity rules.
  const mount = document.createElement('div');
  el.insertBefore(mount, el.firstChild);
  const root = createRoot(mount);
  root.render(
    React.createElement(JsonFormWidget, {
      schema: get('schema'),
      uischema: get('uischema'),
      initialData: get('data'),
      userStyle: get('style'),
    }),
  );
  return () => {
    root.unmount();
    mount.remove();
  };
}

export default { render };
