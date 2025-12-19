# buffee API Reference

## Installation

Include the JavaScript function `Buffee`

```html
<script src="buffee.js"></script>
```

## Required HTML Structure

Layout the HTML for the editor. 
```html
<blockquote class="wb no-select" tabindex="0" id="editor">
  <textarea class="wb-clipboard-bridge" aria-hidden="true"></textarea>
  <div style="display: flex;">
    <div class="wb-gutter"></div>
    <div class="wb-lines"></div>
  </div>
  <div class="wb-status" style="display: flex; justify-content: space-between;">
    <div class="wb-status-left"><span class="wb-linecount"></span></div>
    <div class="wb-status-right">
      <span class="wb-coordinate"></span>
      <span>|</span>
      <span class="wb-indentation"></span>
    </div>
  </div>
</blockquote>
```

## Include the referenced CSSS

```css
.wb {
  background-color: #282C34;
  color: #B2B2B2;
  position: relative;
  outline: none;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}
.no-select { user-select: none; }
.wb-clipboard-bridge {
  position: fixed; left: 0; top: 1px;
  width: 0; height: 1px; opacity: 0; pointer-events: none;
}
.wb .wb-lines pre::before { content: "\200B"; }
.wb .wb-lines pre { margin: 0; overflow: hidden; }
.wb .wb-selection {
  background-color: #EDAD10;
  position: absolute;
  mix-blend-mode: difference;
}
.wb .wb-cursor {
  background-color: #FF6B6B;
  mix-blend-mode: difference;
}
.wb .wb-status span { padding-right: 4px; }
```

## Sizing the Editor

By default, the editor auto-fits to its container (both rows and columns). Use `viewportRows` and `viewportCols` to fix dimensions.

| Dimension | Default | Fixed |
|-----------|---------|-------|
| Height | Auto-fits to container | `viewportRows: N` |
| Width | Fills parent (100%) | `viewportCols: N` |

### Fixed Dimensions

```javascript
// Fixed 80 columns × 25 rows
new Buffee(el, { viewportRows: 25, viewportCols: 80 });
```

The `viewportCols` option auto-calculates container width to fit exactly N text columns plus gutter.

### Auto-fit (Default)

```javascript
// Auto-fit to container (default behavior)
new Buffee(el, {});
```

Requires the container to have defined dimensions:
```css
#editor { width: 100%; height: 100%; }
```

### Dimensions

- Height = `viewportRows` × `lineHeight` pixels (or auto-calculated from container)
- Width = `viewportCols` + gutter in `ch` units (or 100% of parent)

### Auto-fit Details

Auto-fit is enabled by default. The editor will:
- Calculate how many lines fit based on container height and `lineHeight`
- Update automatically when the container is resized (via ResizeObserver)

**Container requirements:**
- The container must have a defined height (e.g., `height: 300px` or `height: 100%` with a sized parent)
- Use `overflow: hidden` on the container to clip partial lines

```html
<div style="height: 400px; overflow: hidden;">
  <blockquote class="wb no-select" tabindex="0" id="editor" style="height: 100%;">
    ...
  </blockquote>
</div>
```

To disable auto-fit, specify `viewportRows` or explicitly set `autoFitViewport: false`.

## Initialize

```javascript
const editor = new Buffee(document.getElementById('editor'), {
  // viewportRows: 20,  // Omit to auto-fit, or specify for fixed height
  // viewportCols: 80,  // Omit to fill parent, or specify for fixed width
  indentation: 4,
  showGutter: true,
  showStatusLine: true,
});
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `viewportRows` | number | (auto) | Fixed visible lines (omit to auto-fit) |
| `viewportCols` | number | (auto) | Fixed text columns (omit to fill parent) |
| `indentation` | number | `4` | Spaces for indent/unindent |
| `expandtab` | number | `4` | Tab width (0 = hard tabs) |
| `showGutter` | boolean | `true` | Show line numbers |
| `showStatusLine` | boolean | `true` | Show status bar |
| `autoFitViewport` | boolean | `true`* | Auto-size viewport to container (*false if viewportRows specified) |
| `logger` | function | `console.log` | Custom logger |

---

## Tabs (`editor.expandtab`)

Soft tabs are enabled by default. Tab characters are replaced with spaces.

```javascript
editor.expandtab = 4;  // Tab key inserts 4 spaces, \t chars become 4 spaces
editor.expandtab = 2;  // Use 2 spaces instead
editor.expandtab = 0;  // Hard tabs (not recommended - cursor positioning may break)
```

---

## Line Height (`editor.lineHeight`)

```javascript
editor.lineHeight;  // 24 (default, from CSS --wb-cell)
```

Read-only. Returns the line height in pixels, derived from CSS variable `--wb-cell`. To customize, override in CSS:

```css
.wb { --wb-cell: 20px; }
```

**Warning:** Do not modify this value - changing it will cause rendering issues.

---

## Model (`editor.Model`)

```javascript
// Set content
editor.Model.text = "Hello\nWorld";

// Access lines
editor.Model.lines;        // ["Hello", "World"]
editor.Model.lastIndex;    // 1

// Modify
editor.Model.splice(1, ["inserted"], 0);
editor.Model.delete(1);
```

---

## Viewport (`editor.Viewport`)

```javascript
// Read
editor.Viewport.start;  // First visible line (0-based)
editor.Viewport.end;    // Last visible line
editor.Viewport.size;   // Number of visible lines
editor.Viewport.lines;  // Array of visible line strings

// Navigate
editor.Viewport.scroll(5);    // Scroll down 5 lines
editor.Viewport.scroll(-3);   // Scroll up 3 lines
editor.Viewport.set(100, 25); // Go to line 100, show 25 lines
```

---

## Selection (`editor.Selection`)

```javascript
// Cursor (row/col are viewport-relative)
editor.Selection.setCursor({ row: 0, col: 5 });
editor.Selection.isSelection;  // false if cursor, true if range

// Selected text
editor.Selection.lines;  // Array of selected lines

// Movement
editor.Selection.moveRow(1);   // Down
editor.Selection.moveRow(-1);  // Up
editor.Selection.moveCol(1);   // Right
editor.Selection.moveCol(-1);  // Left
editor.Selection.moveWord();
editor.Selection.moveBackWord();
editor.Selection.moveCursorStartOfLine();
editor.Selection.moveCursorEndOfLine();

// Editing
editor.Selection.insert("text");
editor.Selection.insertLines(["a", "b"]);
editor.Selection.delete();
editor.Selection.newLine();
editor.Selection.indent();
editor.Selection.unindent();
```

---

## TUI Extension (`editor.TUI`)

TUI is an optional extension for interactive terminal-style UI elements. Include the separate script and initialize:

```html
<script src="buffee.js"></script>
<script src="extensions/tui.js"></script>
```

```javascript
const editor = new Buffee(document.getElementById('editor'), options);
BuffeeTUI(editor);  // Initialize TUI extension

// Now use editor.TUI
editor.TUI.enabled = true;

// Add button (returns ID)
const id = editor.TUI.addButton({
  row: 5,           // Absolute row (0-indexed)
  col: 10,          // Column (0-indexed)
  label: "Button",
  border: true,     // Optional: draws +--+ border around label
  onActivate: (el) => console.log("Clicked!", el)
});

// Add prompt (returns ID)
const promptId = editor.TUI.addPrompt({
  row: 8,
  col: 2,
  width: 30,        // Total width including borders
  title: "Search",
  onActivate: (el) => console.log("Submitted:", el.input)
});

// Add scrollbox (returns ID)
const scrollId = editor.TUI.addScrollBox({
  row: 12,
  col: 2,
  width: 40,
  height: 8,        // Total height including borders
  title: "Logs",
  lines: ["Line 1", "Line 2", "..."],
  onActivate: (el) => console.log("Selected at offset:", el.scrollOffset)
});

// Remove
editor.TUI.removeElement(id);
editor.TUI.clear();

// Query
editor.TUI.elements;          // Raw array of elements (not a copy - mutations are shared)
editor.TUI.currentElement();

// Navigation
editor.TUI.nextElement();      // Move to next (bind to Tab)
editor.TUI.activateElement();  // Trigger callback (bind to Enter)

// Key handling (element-specific behavior)
editor.TUI.handleKeyDown(key); // Returns true if handled

// Highlighting (enabled by default)
editor.TUI.setHighlight(true);   // Enable
editor.TUI.setHighlight(false);  // Disable
```

### Element Types

**Button** (`type: 'button'`)
- Displays label text, optionally with `+-|` border
- Enter key activates (triggers `onActivate`)

**Prompt** (`type: 'prompt'`)
- Displays input box with box-drawing characters: `┌─┐│└┘`
- Printable ASCII keys insert into input
- Backspace deletes last character
- Enter submits (triggers `onActivate` with `el.input`)

**ScrollBox** (`type: 'scrollbox'`)
- Displays scrollable content with box-drawing border
- ArrowUp/k scrolls up, ArrowDown/j scrolls down
- Stops when last line is visible at bottom
- Enter activates (triggers `onActivate` with `el.scrollOffset`)

### Element Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | number | Unique identifier |
| `type` | string | `'button'`, `'prompt'`, or `'scrollbox'` |
| `row` | number | Absolute row position |
| `col` | number | Column position |
| `width` | number | Element width in characters |
| `height` | number | Element height in rows |
| `contents` | string[] | Array of rendered lines |
| `input` | string | User input (prompts only) |
| `title` | string | Title (prompts and scrollboxes) |
| `contentLines` | string[] | Content lines (scrollboxes only) |
| `scrollOffset` | number | Current scroll position (scrollboxes only) |
| `onActivate` | function | Callback when activated |

### Keyboard Binding

```javascript
element.addEventListener('keydown', (e) => {
  if (!editor.TUI.enabled) return;
  if (e.key === 'Tab') {
    e.preventDefault();
    editor.TUI.nextElement();
  } else {
    e.preventDefault();
    editor.TUI.handleKeyDown(e.key);
  }
});
```

---

## Edit Mode (`editor.editMode`)

Controls editing and navigation behavior. Three modes are available:

| Mode | Navigation | Editing | Use Case |
|------|------------|---------|----------|
| `'write'` | Yes | Yes | Default - full editing |
| `'navigate'` | Yes | No | View-only with scrolling |
| `'read'` | No | No | Static display (TUI uses this) |

```javascript
// Default mode - full editing
editor.editMode = 'write';

// Navigate mode - can scroll, no editing
editor.editMode = 'navigate';

// Read mode - no navigation or editing
editor.editMode = 'read';
```

### Common Patterns

**Simple view-only mode:**
```javascript
editor.Model.text = "Your content here";
editor.editMode = 'navigate';
```

**TUI mode** (for interactive elements):
```javascript
editor.Model.text = "Your content here";
editor.TUI.enabled = true;  // Sets editMode to 'read' automatically
```

**UltraHighCapacity** (for very large files):
```javascript
BuffeeUltraHighCapacity(editor);
editor.UltraHighCapacity.activate();  // Sets editMode to 'navigate' automatically
await editor.UltraHighCapacity.appendLines(["Line 1", "Line 2", ...]);
```

---

## Tree-sitter Extension (`editor.TreeSitter`)

Tree-sitter is an optional extension for syntax highlighting. Include the separate script and initialize with a parser and query:

```html
<script src="buffee.js"></script>
<script src="extensions/treesitter.js"></script>
```

```javascript
const editor = new Buffee(document.getElementById('editor'), options);
BuffeeTreeSitter(editor, { parser: jsParser, query: jsQuery });

// Enable syntax highlighting
editor.TreeSitter.enabled = true;

// After modifying content, mark as dirty to trigger re-parse
editor.Model.text = "function hello() { return 'world'; }";
editor.TreeSitter.markDirty();

// Force immediate re-parse
editor.TreeSitter.reparse();

// Access parse tree and captures (read-only)
editor.TreeSitter.tree;     // Current parse tree
editor.TreeSitter.captures; // Current query captures
```

### CSS Classes

The extension adds these classes for styling:

```css
.highlight-function { color: #c678dd; }
.highlight-function-name { color: #61afef; }
.highlight-string { color: #98c379; }
```

### Performance

Tree-sitter rendering is capped at 60fps using a dirty flag pattern. Call `markDirty()` after content changes to trigger re-parsing on the next animation frame.

---

## UltraHighCapacity Extension (`editor.UltraHighCapacity`)

UltraHighCapacity is an optional extension for loading and viewing very large files (1B+ lines). It compresses lines into gzip chunks and decompresses on-demand for efficient memory usage.

```html
<script src="buffee.js"></script>
<script src="extensions/ultrahighcapacity.js"></script>
```

```javascript
const editor = new Buffee(document.getElementById('editor'), options);
BuffeeUltraHighCapacity(editor);

// Activate ultra-high-capacity mode (disables editing)
editor.UltraHighCapacity.activate(50000);  // 50k lines per chunk

// Append lines (must use this, not Model.text)
await editor.UltraHighCapacity.appendLines(largeArrayOfLines);

// Check status
editor.UltraHighCapacity.enabled;     // true
editor.UltraHighCapacity.totalLines;  // total line count
editor.UltraHighCapacity.chunkCount;  // number of compressed chunks

// Clear all data
editor.UltraHighCapacity.clear();

// Deactivate and restore normal mode
editor.UltraHighCapacity.deactivate();
```

### Important Notes

- **Do not use `Model.text`** in chunked mode - use `appendLines()` instead
- Editing is automatically disabled when activated
- Chunks are loaded asynchronously - "..." placeholders shown while loading
- Viewport can straddle at most 2 chunks (previous + current or current + next)

---

## Extension API (`editor._internals`)

The `_internals` object exposes internal state for building extensions. Extensions can hook into the render cycle without buffee needing to know about them.

```javascript
const {
  head,           // Cursor position { row, col } (viewport-relative)
  $e,             // Lines container DOM element
  render,         // render(rebuildContainers?) function
  renderHooks     // Hook registration object
} = editor._internals;

// Public properties (use these instead of _internals)
const { Viewport, Selection, Model, lineHeight } = editor;
```

### Render Hooks

Extensions register callbacks that run during the render cycle:

```javascript
// Called when viewport containers are rebuilt (resize, initial render)
renderHooks.onContainerRebuild.push(($container, viewport) => {
  // Set up DOM elements, highlights, etc.
});

// Called after text content is set (for overlaying elements)
renderHooks.onRenderContent.push(($container, viewport) => {
  // Modify textContent, add overlays, etc.
});

// Called at end of render (for final touches)
renderHooks.onRenderComplete.push(($container, viewport) => {
  // Update highlights, animations, etc.
});
```

### Example: Custom Extension

```javascript
function MyExtension(vbuf) {
  const { renderHooks, render } = vbuf._internals;

  // Register render hook
  renderHooks.onRenderComplete.push(($e, viewport) => {
    // Custom rendering logic
  });

  // Expose API on vbuf instance
  vbuf.MyExtension = {
    enable() { vbuf.editMode = 'navigate'; render(true); },
    disable() { vbuf.editMode = 'write'; render(true); }
  };
}

// Usage
const editor = new Buffee(el, options);
MyExtension(editor);
editor.MyExtension.enable();
```
