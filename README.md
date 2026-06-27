# myst-jsonform

A [MyST](https://mystmd.org) plugin providing a `{jsonform}` directive that
renders an interactive form from a [JSON Schema](https://json-schema.org), using
[JSONForms](https://jsonforms.io).

## Usage

Add the plugin to your `myst.yml`:

```yaml
project:
  plugins:
    - https://cdn.jsdelivr.net/gh/flotpython/myst-jsonform@main/dist/jsonform.mjs
```

Then use the directive. The body specifies your form schema, and can be written in either **YAML or JSON**
(YAML is a superset of JSON, so both work):

````markdown
```{jsonform}
type: object
properties:
  name:
    type: string
    title: Your name
  age:
    type: integer
    title: Age
    minimum: 0
```
````

Supported out of the box: 
- strings (with `format` for `email`, `uri`, `date`,
`date-time`, `time`), 
- integers/numbers (with `minimum`/`maximum`), booleans
(checkboxes), 
- `enum` (dropdowns), arrays of `enum` (multi-select checkboxes),
- arrays of objects (add/remove tables),
- and `required` + validation.

**Not supported:** as of this preliminary version:
- nested `object` properties. With a schema-only directive (no UI schema), JSONForms' 
  auto-generated layout does not expand nested objects into sub-forms.

## How it works

The directive emits an [anywidget](https://anywidget.dev) node. The browser-side
widget (`dist/widget.mjs`) is a self-contained bundle of React + JSONForms

This is important so there is exactly one copy of React and of `@jsonforms/core`.
The plugin itself (`dist/jsonform.mjs`) is bundled too (with
`js-yaml` inlined) so it can be loaded directly from a URL.

## Development

Requires [bun](https://bun.sh).

```bash
bun install
bun run build      # builds dist/widget.mjs and dist/jsonform.mjs
bun run watch      # rebuilds the widget on change (for local iteration)
```

For local iteration, point your `myst.yml` at the source plugin instead of the
URL; it automatically uses the local `dist/widget.mjs` when present:

```yaml
project:
  plugins:
    - /absolute/path/to/myst-jsonform/src/jsonform.mjs
```

## Releasing

The `dist/` bundles are committed to the repository (that is what users load via
jsDelivr). After changing anything under `src/`:

```bash
bun run build
git add dist
git commit -m "rebuild"
git push
```

## Unversioned for now; but about versioning

jsDelivr serves `@main` with a cache of up to ~12 h. 

In the future we may move to a pinned versioning scheme; 

```bash
git tag v0.1.0 && git push --tags
```

For that we'd need to have users reference the tag instead of `@main`:

```yaml
- https://cdn.jsdelivr.net/gh/flotpython/myst-jsonform@v0.1.0/dist/jsonform.mjs
```

In that case there would also be a need to have `WIDGET_URL` in
`src/jsonform.mjs` follow up on the new tag, so the plugin pulls the matching widget bundle.
