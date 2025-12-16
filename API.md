# vbuf API Reference

## Installation

Include the JavaScript function `Vbuf`

```html
<script src="vbuf.js"></script>
```

## Required HTML Structure

Layout the HTML for the editor. 
```html
<blockquote class="wb no-select" tabindex="0" id="editor">
  <textarea class="wb-clipboard-bridge" aria-hidden="true"></textarea>
  <div style="display: flex;">
    <div class="wb-gutter"></div>
    <div class="wb-lines" style="flex: 1; overflow: hidden;"></div>
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
.wb .wb-lines > pre::before { content: "\200B"; }
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

Height is controlled by `initialViewportSize` (number of lines). Width is set via CSS.

### Width Gotchas

Setting `width: 40ch` on the container does **not** give you 40 columns of text. The width includes:
- Gutter (line numbers) - ~5ch with default settings
- Internal padding - ~1.5ch
- Border (if not using `box-sizing: border-box`)

Observed results with `width: 40ch`:
- With gutter: ~35 characters visible
- Without gutter: ~38 characters visible

### Recommendations

**Option 1: Account for overhead**

Add extra width to compensate for gutter and padding:
```css
#editor {
  font-size: 24px; /* must match lineHeight */
  width: 86ch;     /* ~80 usable columns */
}
```

**Option 2: Hide gutter and minimize padding**

```javascript
new Vbuf(el, { showGutter: false, editorPaddingPX: 0 });
```

**Option 3: Use 100% width**

Let the editor fill its parent and don't worry about exact column count:
```css
#editor { width: 100%; }
```

**Option 4: Use `fit-content` on parent**

Let the editor determine its own width, then wrap:
```css
.container { width: fit-content; }
```

### Font-size requirement

For `ch` units to work correctly, the container's `font-size` must match `lineHeight` (default 24px):
```css
#editor {
  font-size: 24px; /* must match lineHeight */
  width: 80ch;
}
```

### Dimensions

- Height = `initialViewportSize` × `lineHeight` pixels
- Width = specified width minus gutter, padding, and border

## Initialize

```javascript
const editor = new Vbuf(document.getElementById('editor'), {
  colorPrimary: "#B2B2B2",
  colorSecondary: "#212026",
  initialViewportSize: 20,
  lineHeight: 24,
  indentation: 4,
  showGutter: true,
  showStatusLine: true,
});
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colorPrimary` | string | `"#B2B2B2"` | Text and status bar color |
| `colorSecondary` | string | `"#212026"` | Gutter and status background |
| `initialViewportSize` | number | `20` | Visible lines |
| `lineHeight` | number | `24` | Line height in pixels |
| `indentation` | number | `4` | Spaces for indent/unindent |
| `expandtab` | number | `4` | Tab width (0 = hard tabs) |
| `showGutter` | boolean | `true` | Show line numbers |
| `showStatusLine` | boolean | `true` | Show status bar |
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
editor.lineHeight;  // 24 (default)
```

Read-only. Returns the line height in pixels. Useful for extensions that need to position elements.

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
editor.Model.appendLines(["Line 3", "Line 4"]);
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
<script src="vbuf.js"></script>
<script src="extensions/tui.js"></script>
```

```javascript
const editor = new Vbuf(document.getElementById('editor'), options);
VbufTUI(editor);  // Initialize TUI extension

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

**ChunkLoader** (for very large files):
```javascript
VbufChunkLoader(editor);
editor.ChunkLoader.activate();  // Sets editMode to 'navigate' automatically
await editor.ChunkLoader.appendLines(["Line 1", "Line 2", ...]);
```

---

## Utility

```javascript
// Append line and scroll to bottom (useful for logs)
editor.appendLineAtEnd("Log entry");
```

---

## Tree-sitter Extension (`editor.TreeSitter`)

Tree-sitter is an optional extension for syntax highlighting. Include the separate script and initialize with a parser and query:

```html
<script src="vbuf.js"></script>
<script src="extensions/treesitter.js"></script>
```

```javascript
const editor = new Vbuf(document.getElementById('editor'), options);
VbufTreeSitter(editor, { parser: jsParser, query: jsQuery });

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

## ChunkLoader Extension (`editor.ChunkLoader`)

ChunkLoader is an optional extension for loading and viewing very large files. It compresses lines into gzip chunks and decompresses on-demand for efficient memory usage.

```html
<script src="vbuf.js"></script>
<script src="extensions/chunkloader.js"></script>
```

```javascript
const editor = new Vbuf(document.getElementById('editor'), options);
VbufChunkLoader(editor);

// Activate chunked mode (disables editing)
editor.ChunkLoader.activate(50000);  // 50k lines per chunk

// Append lines (must use this, not Model.text)
await editor.ChunkLoader.appendLines(largeArrayOfLines);

// Check status
editor.ChunkLoader.enabled;     // true
editor.ChunkLoader.totalLines;  // total line count
editor.ChunkLoader.chunkCount;  // number of compressed chunks

// Clear all data
editor.ChunkLoader.clear();

// Deactivate and restore normal mode
editor.ChunkLoader.deactivate();
```

### Important Notes

- **Do not use `Model.text`** in chunked mode - use `appendLines()` instead
- Editing is automatically disabled when activated
- Chunks are loaded asynchronously - "..." placeholders shown while loading
- Viewport can straddle at most 2 chunks (previous + current or current + next)

---

## Extension API (`editor._internals`)

The `_internals` object exposes internal state for building extensions. Extensions can hook into the render cycle without vbuf needing to know about them.

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
const editor = new Vbuf(el, options);
MyExtension(editor);
editor.MyExtension.enable();
```
