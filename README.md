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