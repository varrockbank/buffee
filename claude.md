# Claude Instructions for vbuf

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

Always show the constructor and relevant API calls used. Show JS code line by line:

```html
<p class="text-neutral-500 text-xs">JS:</p>
<p class="text-neutral-500 text-xs mb-4">
  <code class="text-green-400">new Vbuf(el, { initialViewportSize: 15 })</code>
</p>
```

For multiple lines of JS:
```html
<p class="text-neutral-500 text-xs">JS:</p>
<p class="text-neutral-500 text-xs"><code class="text-green-400">new Vbuf(el, { initialViewportSize: 18, showGutter: false })</code></p>
<p class="text-neutral-500 text-xs"><code class="text-green-400">TUI.addButton({ row, col, label, border: true, onActivate })</code></p>
<p class="text-neutral-500 text-xs"><code class="text-green-400">TUI.addPrompt({ row, col, width, title, onActivate })</code></p>
<p class="text-neutral-500 text-xs mb-4"><code class="text-green-400">TUI.enabled = true</code></p>
```

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
