# Claude Instructions for vbuf

## Required HTML Structure for Vbuf Editors

**IMPORTANT**: When creating Vbuf editor instances (in tests, samples, or anywhere), you MUST include ALL of these elements. Vbuf queries for them and will throw `Cannot set properties of null` errors if any are missing.

```html
<blockquote class="wb no-select" tabindex="0">
    <textarea class="wb-clipboard-bridge" aria-hidden="true"></textarea>
    <div style="display: flex">
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

**Required elements checklist:**
- [ ] `.wb` - Main container (blockquote)
- [ ] `.wb-clipboard-bridge` - Hidden textarea for clipboard
- [ ] `.wb-gutter` - Line numbers container
- [ ] `.wb-lines` - Text content container
- [ ] `.wb-status` - Status bar container
- [ ] `.wb-linecount` - Line count display
- [ ] `.wb-coordinate` - Cursor position display
- [ ] `.wb-indentation` - Indentation display

Missing ANY of these will cause runtime errors.

## Writing Tests (specs.dsl)

When writing tests in `test/specs.dsl`, follow these guidelines:

### Viewport Size
- Default viewport is **10 lines** (both tests and walkthrough)
- To trigger scrolling, type 11+ lines of content

### Use DSL Commands
Always use DSL commands to set up test state:

**Do this:**
```
TYPE "line0"
enter
TYPE "line1"
enter
TYPE "line2"
```

**Not this:**
```
fixture.wb.Model.text = "line0\nline1\nline2";
```

### Navigation
Use arrow keys and DSL commands instead of direct API calls:

**Do this:**
```
up 9 times
left with meta
```

**Not this:**
```
fixture.wb.Viewport.scroll(2);
```

### Available Modifiers
- `with meta` - Cmd/Ctrl key
- `with shift` - Shift key
- `with alt` - Alt/Option key (for word movement)
- Can combine: `right with meta, shift`

### Coordinate System
- `EXPECT cursor at row,col` uses **absolute 0-indexed** coordinates
- `EXPECT selection at r1,c1-r2,c2` uses **absolute 0-indexed** coordinates
- Row 0 is the first line of the document, regardless of viewport scroll position

### Test Structure
```
## should describe what the test verifies
### Short description for walkthrough display
// Setup comments
TYPE "content"
enter
// Action
left with alt
// Assertions
expect(fixture.wb.Viewport.start).toBe(0);
EXPECT cursor at 0,5
```

## Cursor Model (Vim-style)

vbuf uses a vim-style cursor model:

- **Cursor sits ON a character**, not between characters
- After typing "ABC", cursor is at col 3 (past the last character)
- `left` moves cursor onto the previous character
- **Shift+Arrow selects inclusively**: selecting left includes the current character AND the character(s) moved over

Example:
```
Type "ABC"     → cursor at col 3 (after C)
left 2 times   → cursor at col 1 (on B)
left with shift → selects "AB" (includes B where cursor was + A moved over)
```

This differs from editors where cursor sits between characters (like a thin I-beam).

## Extensions

vbuf has a modular extension system. Extensions are located in `extensions/` and are tested in the "Extensions" tab of the test UI (`test/index.html`).

### Available Extensions

| Extension | File | Description |
|-----------|------|-------------|
| **Syntax** | `syntax.js` | Regex-based syntax highlighting with state caching |
| **Elementals** | `elementals.js` | DOM-based UI elements (buttons, inputs, labels) in a layer above text |
| **TUI Legacy** | `tui-legacy.js` | Text-based UI elements via text manipulation |
| **ChunkLoader** | `chunkloader.js` | Lazy loading for large files |

### Extension Architecture

Extensions follow a consistent pattern:

```javascript
function VbufExtension(vbuf, options = {}) {
  // Access internals via vbuf._internals
  const { render, renderHooks } = vbuf._internals;

  // Create extension API
  const Extension = {
    enabled: false,
    // ... methods
  };

  // Attach to vbuf instance
  vbuf.Extension = Extension;
  return Extension;
}
```

### Using Extensions

```javascript
const editor = new Vbuf(element, options);

// Initialize extension
VbufSyntax(editor);
editor.Syntax.setLanguage('javascript');
editor.Syntax.enabled = true;

// Initialize another extension
VbufElementals(editor);
editor.Elementals.addButton({ row: 1, col: 5, label: 'OK' });
editor.Elementals.enabled = true;
```

### Writing Extension Tests

Extension tests are pure JavaScript (not DSL-based) and live in the "Extensions" tab. Use the following pattern:

```javascript
extRunner.describe('My Extension', () => {
    extRunner.it('does something', () => {
        const { editor, cleanup } = createTestEditor();
        try {
            VbufMyExtension(editor);
            // Test assertions
            assertTrue(editor.MyExtension.enabled);
            assertEqual(editor.MyExtension.value, expected);
        } finally {
            cleanup();
        }
    });
});
```

**Assertion helpers:**
- `assertEqual(actual, expected, msg)` - Strict equality
- `assertDeepEqual(actual, expected, msg)` - JSON equality
- `assertTrue(value, msg)` - Value is truthy
- `assertFalse(value, msg)` - Value is falsy

### Syntax Extension Details

The syntax extension uses a state machine tokenizer:

- **State cache**: `stateCache[lineIndex]` stores the tokenizer state at the start of each line
- **Incremental**: On edit, cache is invalidated from the edited line forward
- **Languages**: Built-in support for JavaScript, HTML, CSS, JSON, Python

Key methods:
- `editor.Syntax.setLanguage(lang)` - Set the language grammar
- `editor.Syntax.tokenizeLine(text, startState)` - Tokenize a single line
- `editor.Syntax.ensureStateCache(lineIndex)` - Populate cache up to line

### Elementals vs TUI Legacy

| Feature | Elementals | TUI Legacy |
|---------|------------|------------|
| Implementation | DOM elements in overlay | Text manipulation |
| Cursor interaction | Separate layer | Affects text content |
| Styling | CSS classes | Inline spans |
| Use case | Rich interactive UI | Simple text-based UI |

## Generating Sample Pages

When creating sample HTML pages in the `samples/` directory, follow these guidelines:

### 1. Use Tailwind CSS

Include Tailwind via CDN in the head:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

### 2. Consistent Page Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>vbuf - [Sample Name]</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="../vbuf.js"></script>
  <style>
    /* Only vbuf-required styles here - no page layout styles */
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
    .wb .wb-status span { padding-right: 4px; }
  </style>
</head>
<body class="bg-neutral-900 p-5 font-sans">
  <h1 class="text-white text-lg mb-2">[Sample Title]</h1>
  <p class="text-neutral-400 text-sm mb-4">[Description]</p>

  <!-- Editor markup -->

  <script>
    // Initialize editor
  </script>
</body>
</html>
```

### 3. Standard Color Palette

Use these consistent colors:

| Element | Color |
|---------|-------|
| Page background | `bg-neutral-900` (#171717) |
| Heading text | `text-white` |
| Body text | `text-neutral-400` |
| Editor background | `#282C34` |
| Editor text | `#B2B2B2` |
| Selection highlight | `#EDAD10` |
| Editor border | `border-neutral-700` |
| Status bar background | `#212026` |

### 4. Keyboard Hints

When showing keyboard shortcuts, use this pattern:

```html
<p class="text-neutral-400 text-sm mb-4">
  Press <kbd class="bg-neutral-700 border border-neutral-500 rounded px-1.5 py-0.5 font-mono text-white text-xs">Tab</kbd> to navigate
</p>
```

### 5. Output/Log Areas

For demo output areas:

```html
<div class="font-mono text-green-400 mt-3 p-3 bg-neutral-950 border border-neutral-700 min-h-[24px]">
  Output appears here...
</div>
```

### 6. Form Controls

For input fields and buttons:

```html
<div class="flex items-center gap-3 mb-3 flex-wrap">
  <label class="text-neutral-400 text-sm">Row:</label>
  <input type="number" class="bg-neutral-800 border border-neutral-600 text-white px-2 py-1 w-16 rounded">
  <button class="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-sm">Add</button>
</div>
```

### 7. Configuration Hints

Always show the **exact** constructor and API calls used in the sample with **actual values**, not generic parameter names. Show JS code line by line:

```html
<p class="text-neutral-500 text-xs">JS:</p>
<p class="text-neutral-500 text-xs mb-4">
  <code class="text-green-400">new Vbuf(el, { initialViewportSize: 15 })</code>
</p>
```

For multiple lines of JS, use the exact values from the sample:
```html
<p class="text-neutral-500 text-xs">JS:</p>
<p class="text-neutral-500 text-xs"><code class="text-green-400">new Vbuf(el, { initialViewportSize: 8, showGutter: false })</code></p>
<p class="text-neutral-500 text-xs"><code class="text-green-400">TUI.addPrompt({ row: 1, col: 2, width: 30, title: 'Search' })</code></p>
<p class="text-neutral-500 text-xs mb-4"><code class="text-green-400">TUI.enabled = true</code></p>
```

**Important:** Do NOT use generic parameter names like `row, col, width`. Show the actual values:
- Bad: `TUI.addButton({ row, col, label, border: true })`
- Good: `TUI.addButton({ row: 1, col: 2, label: ' OK ', border: true })`

For multiple variants, use h2 headings:
```html
<h2 class="text-neutral-300 text-sm mt-8 mb-2">No gutter (line numbers hidden)</h2>
<p class="text-neutral-500 text-xs">JS:</p>
<p class="text-neutral-500 text-xs mb-4"><code class="text-green-400">new Vbuf(el, { showGutter: false })</code></p>
```

### 8. Editor Container

Always use these classes on the editor blockquote:

```html
<blockquote class="wb no-select border border-neutral-700 w-[600px]" tabindex="0" id="editor">
```

Adjust width as needed: `w-[400px]`, `w-[600px]`, `w-full`, etc.
