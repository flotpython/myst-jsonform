# myst-jsonform

A [MyST](https://mystmd.org) plugin providing a `{jsonform}` directive that
renders an interactive form from a [JSON Schema](https://json-schema.org), using
[JSONForms](https://jsonforms.io).

## Install

Add the plugin to your `myst.yml`:

```yaml
project:
  plugins:
    - https://cdn.jsdelivr.net/gh/flotpython/myst-jsonform@main/dist/jsonform.mjs
```

## The directive body: two modes

The body can be written in **YAML or JSON**, in one of two modes.

### Mode 1 — a single Schema

The whole body *is* the JSON Schema. JSONForms auto-generates the layout.

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

### Mode 2 — a folded form with named chunks

If the body has a top-level `Schema:` key, it is read as a set of named chunks.
This unlocks a custom layout, initial data, and styling. Two families of keys:

**JSONForms-native** — these mirror the three tabs on the
[jsonforms.io](https://jsonforms.io) examples:

| key        | supported by |required | meaning | 
|------------|----------|---------|---|
| `Schema`   | jsonforms.io | yes      | the JSON Schema | 
| `UISchema` | jsonforms.io | no, auto-generated if omitted     | the [UI Schema](https://jsonforms.io/docs/uischema/) (layout);  | 
| `Data`     | jsonforms.io | no       | initial form data | 
| `Style`    | this plugin  | no | per-form CSS — see [Styling](#styling) | 
| `Submit`   | this plugin  | no, defaults to `print` | what happens on submit — see [Submit actions](#submit-actions) | 

Key names are matched case-insensitively and ignoring spaces/underscores, so
`UISchema`, `UI Schema` and `ui_schema` are equivalent.

````markdown
```{jsonform}
Schema:
  type: object
  properties:
    firstName: {type: string, title: First name}
    lastName:  {type: string, title: Last name}
UISchema:
  type: HorizontalLayout
  elements:
    - {type: Control, scope: "#/properties/firstName"}
    - {type: Control, scope: "#/properties/lastName"}
Data:
  firstName: Ada
```
````

## What's supported

From a bare schema, JSONForms renders:

- strings (with `format` for `email`, `uri`, `date`, `date-time`, `time`)
- integers / numbers (with `minimum` / `maximum`)
- booleans (checkboxes)
- `enum` (dropdowns), and arrays of `enum` (multi-select checkboxes)
- arrays of objects (add/remove tables)
- `required` fields and live validation (the Submit button stays disabled until
  the form is valid)

### Nested objects

A **bare schema** does *not* expand nested `object` properties — JSONForms'
auto-generated layout only renders the top-level fields. To render nested
objects, use Mode 2 and provide a `UISchema` whose controls point at the nested
scopes (typically inside a `Group`):

````markdown
```{jsonform}
Schema:
  type: object
  properties:
    name: {type: string, title: Name}
    address:
      type: object
      properties:
        street: {type: string, title: Street}
        city:   {type: string, title: City}
UISchema:
  type: VerticalLayout
  elements:
    - {type: Control, scope: "#/properties/name"}
    - type: Group
      label: Address
      elements:
        - {type: Control, scope: "#/properties/address/properties/street"}
        - {type: Control, scope: "#/properties/address/properties/city"}
```
````

## Styling

The form renders inside an open shadow root, so it is style-isolated from the
page. There are three ways to customise it:

1. **Theme variables (site-wide).** The base stylesheet exposes CSS custom
   properties — `--jsonform-accent`, `--jsonform-accent-hover`,
   `--jsonform-border`, `--jsonform-radius`, `--jsonform-muted`,
   `--jsonform-error`, `--jsonform-gap`, `--jsonform-max-width`, … Because
   inherited properties cross the shadow boundary, you can override them with
   ordinary site CSS:

   ```css
   :root { --jsonform-accent: #2e7d32; --jsonform-radius: 10px; }
   ```

2. **Inline CSS (per form).** A `Style:` chunk with verbatim rules, injected
   into that form only:

   ````markdown
   ```{jsonform}
   Schema:
     type: object
     properties: {name: {type: string, title: Name}}
   Style: |
     .control > label { color: rebeccapurple; }
     .control input { border: 2px solid rebeccapurple; }
   ```
   ````

3. **External stylesheet (per form).** A `Style:` value that is a path or URL
   ending in `.css` is treated as a reference; mystmd stages the file and links
   it inside the form's shadow root:

   ```yaml
   Style: _static/style_forms.css
   ```

## Submit actions

The `Submit` chunk says what happens when the (validated) form is submitted. It
is either a single action or a **list** of actions, each with a `type`. On
submit they run in order; the form reports **success only if every action
succeeds**, otherwise it shows the first failure.

If `Submit` is omitted, the default is a single `print` action.

### `type: print`

Shows the collected data as JSON below the form (the default behaviour). Always
succeeds.

```yaml
Submit:
  type: print
```

### `type: webapi`

Sends the data to an HTTP endpoint with `fetch`.

| key      | default      | meaning |
|----------|--------------|---------|
| `url`    | *(required)* | endpoint to send to |
| `method` | `POST`       | HTTP method |
| `json`   | `false`      | content-type: `false` → `text/plain` (no CORS preflight), `true` → `application/json` |

```yaml
Submit:
  type: webapi
  url: https://data-collector.example/survey/12/response
```

- **Success** = the response status is `2xx`. Redirects (`3xx`) are followed.
- **CORS**: by default the body is sent as `text/plain` (still a JSON string),
  which is a "simple" request and avoids the browser's CORS preflight — so the
  endpoint only needs to return `Access-Control-Allow-Origin`. Set `json: true`
  to use the official `application/json` content-type, which triggers a preflight
  (the server must then also handle `OPTIONS`). All CORS configuration is on the
  **endpoint's** server, never the page's.

### A list of actions

```yaml
Submit:
  - type: print
  - type: webapi
    url: https://data-collector.example/survey/12/response
```

## More examples

A page exercising the directive (types, layouts, styling) is published at:

- <https://jupyterlab-examples.info-mines.paris/jsonforms-nb/>

and its source is:

- <https://raw.githubusercontent.com/flotpython/jupyterlab-examples/refs/heads/main/notebooks/3-11-jsonforms-nb.md>

## How it works

The directive emits an [anywidget](https://anywidget.dev) node. The browser-side
widget (`dist/widget.mjs`) is a self-contained bundle of React + JSONForms, so
there is exactly one copy of React and of `@jsonforms/core` — no CDN resolution
at view time. The plugin itself (`dist/jsonform.mjs`) is bundled too (with
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

jsDelivr serves `@main` with a cache of up to ~12 h. For reproducible, instantly
pinned releases, tag a version and have users reference it instead of `@main`
(and bump the `WIDGET_URL` tag in `src/jsonform.mjs` to match):

```bash
git tag v0.1.0 && git push --tags
```

```yaml
    - https://cdn.jsdelivr.net/gh/flotpython/myst-jsonform@v0.1.0/dist/jsonform.mjs
```
