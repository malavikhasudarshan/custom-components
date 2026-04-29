# custom-components

Abigail Brooks-Ramirez, Souradeep Das, Malavikha Sudarshan

---

## Commands (VS Code Extension)
- `CustomComponents: Slice Selection`
- `CustomComponents: Open Variant Studio`
- `CustomComponents: Save to Library`
- `CustomComponents: Quick Insert from Library`

## Workspace artifacts
- `.custom-components/library/*.component.json`
- `.custom-components/generated/*.component.js`

## Development
- Run tests: `npm test`
- Load extension in VS Code via "Run Extension" from this folder.

## Current MVP scope
- Parsing is TSX/JSX-first and deterministic for straightforward static styling.
- Dynamic expressions are flagged in slicer warnings.

## Chrome extension package
A browser-packaged version is available in `chrome-extension/`.

### Load unpacked in Chrome
1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

### Use it
1. Open the extension popup
2. Paste an HTML slice
3. Edit variant attributes (color, font-size, border-radius, text)
4. Click **Preview** to compare changes
5. Click **Download JS** to export a browser-ready custom element script

Then include the generated script in an HTML page with:
`<script type="module" src="your-tag.component.js"></script>`
and use `<your-tag></your-tag>` in your markup.

## HTML/CSS and drag-drop support
- VS Code slicer supports selected HTML/JSX plus extraction of matching class rules from an in-file `<style>` block.
- Variant Studio supports draggable variant cards and drop-to-insert snippets into the active editor.
- Chrome extension popup supports draggable variant cards and drop-to-generate snippets.


## Demo version (ready to run)
A full demo is included in `demo/`.

### 1) Browser-only quick demo
1. From repo root, run: `python3 -m http.server 8000`
2. Open: `http://localhost:8000/demo/index.html`
3. You will see 3 `<demo-card>` variants rendered from `demo/generated/demo-card.component.js`.

### 2) End-to-end generation demo (Chrome extension)
1. Load unpacked extension from `chrome-extension/`.
2. Open `demo/source-slice.html` and copy the `<style>...</style>` + `<div class="card">...</div>` block.
3. In extension popup, paste into **HTML slice**.
4. Set attributes and click **Make Draggable Variant Card**.
5. Drag card to drop zone to generate snippet.
6. Click **Download JS**, save into `demo/generated/`.
7. Update script path in `demo/index.html` if filename differs, then refresh the page.

### 3) End-to-end generation demo (VS Code extension)
1. Open `demo/source-slice.html` in VS Code.
2. Select the `<div class="card">...</div>` line.
3. Run `CustomComponents: Slice Selection`.
4. Run `CustomComponents: Open Variant Studio`.
5. Create draggable variant cards and drop them into the drop zone to insert snippet.
6. Run `CustomComponents: Save to Library` and inspect `.custom-components/` outputs.

