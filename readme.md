# Buffee

A capable text editor on the web. Retro text-mode graphics with fixed-width cells in grid-layout is not a bug, it's a feature! 

- tiny footprint: ~4kb, zero-dependency, low memory/CPU 
- performance: rivals native editors like Vim
- heavy-duty: ~70m+ SLOC files, (1B+ in ultra-high-capacity mode)
- spartan: no build step, no NPM, Just vendor the VanillaJS function. minimal surface area.
- extensible: TUI, syntax highlighting modules, hackable API/internals

![](resources/preview.png)

[Demo](https://varrockbank.github.io/buffee/

[Interactive Test Playground](https://varrockbank.github.io/buffee/test/)

## Embeddability 

1. spartan (while still having full text editor capabilities)
2. hackable
3. tiny 

This trifecta uniquely positions buffee as a building block for rich editing experience, IDEs and apps. In fact, this guides what features to scope and omit.

See `comparison.html` and `performance.html` for more on Buffee's niche.

## Usage

### Font Requirements

Buffee assumes monospace fonts with accurate CSS `ch` values. When this assumption breaks, the cursor drifts from expected position over long lines.

- **Good:** Menlo, Consolas, `monospace` (generic)
- **Bad:** Monaco

To test: type "A" 100+ times and move cursor to end. If misaligned, try a different font.

### Required CSS

Use `style.css` which contains all structural styles. Then define colors for your instance:

```css
/* Your colors */
.wb {
  background-color: #282C34;
  color: #B2B2B2;
}
.wb .wb-selection {
  background-color: #EDAD10;
}
.wb .wb-cursor {
  background-color: #FF6B6B;
}
```

Or include everything inline (structural + colors):

```css
.wb {
  background-color: #282C34;
  color: #B2B2B2;
  position: relative;
  outline: none;
  font-family: 'Menlo', 'Consolas', monospace;
}
.no-select { user-select: none; }
.wb-clipboard-bridge {
  position: fixed; left: 0; top: 1px;
  width: 0; height: 1px; opacity: 0; pointer-events: none;
}
.wb .wb-lines { overflow-x: hidden; }
.wb .wb-lines pre::before { content: "\200B"; }
.wb .wb-lines pre { margin: 0; overflow: visible; white-space: pre; }
.wb .wb-selection {
  background-color: #EDAD10;
  position: absolute;
  mix-blend-mode: difference;
}
.wb .wb-cursor { background-color: #FF6B6B; mix-blend-mode: exclusion; }
.wb .wb-status span { padding-right: 4px; }
```

### Required HTML

Editor instances bind to DOM node with this structure:

```html
<blockquote cite="" class="💪 🍜 🥷 🌕 🪜 wb no-select" tabindex="0" id="playground">
  <!-- Hidden clipboard bridge lives inside the editor so copy bubbles through it -->
  <textarea class="wb-clipboard-bridge" aria-hidden="true"></textarea>
    <div class="💪">
      <div class="wb-gutter"></div>
      <div class="wb-lines 🌳 🥷"></div>
    </div>
    <div class="💪 wb-status 🦠">
      <div class="wb-status-left 💪">
        <span class="wb-linecount"></span>
      </div>
      <div class="wb-status-right 💪">
        <span class="wb-coordinate"></span>
        <span>|</span>
        <span class="wb-indentation"></span>
    </div>
  </div>
</blockquote>

<script>
  const editorInstance = new Buffee(document.getElementById("playground"), <config>);
</script>
```

### Auto-fit Viewport

To automatically size the editor to fill its container height:

```javascript
new Buffee(el, { autoFitViewport: true });
```

The container must have a defined height. The editor will resize automatically when the container changes.

**CSS requirement with status bar:** When using `autoFitViewport: true` with a visible status bar, the editor container needs flex layout:

```css
.wb {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
```

Without status bar, only `height: 100%; width: 100%;` is needed.

### Model-view-controller API

**Model** `instance.Model.lines` is the text buffer

**View** `instance.Viewport` subset of indices of text buffer to be rendered

**Controller** `instance.Selection` text editor operations are relative to the text Selection. Cursor are just a special case of Selection. Historically, indexing was Viewport relative but now absolute.

## Extensibility

Historically, extensibility was only via the MVC APIs. However, extensions can access deeper internals. See extensions directory for examples including:

- Tree-sitter (experimental)
- Regex based syntax highlighting
- TUI (legacy that fiddles with)
- Elementals (TUI 2.0 that uses layer API)

iOS support is currently provided as an extension which maps iOS events to keyboard events. see: index.html for example.

## Distributable

There is no build process needed to vendor `Buffee` global function nor is there to work on the code. However, the minified distributable is created with globally installed `Terser`. This is done by a pre-commit hook ensuring `dist/buffee.min.js` is updated in sync. 
`scripts/setup-hooks.sh` symlinks:

```sh
ln -s ../../hooks/pre-commit .git/hooks/pre-commit
```


## Innovation 

Key insight is maintaining small footprint in the DOM and 
then performing surgical DOM updates. Furthermore, the fixed-width character grid
simplifies some rendering challenges.

The zeitgeist of webdev is VDOM and efficient incrementality but this abstraction does not come free. Furthermore, the smallest VDOM diffing libraries are larger than buffee's entire footprint.

Buffers are the darkhorses of text editor implementations. They map 1:1 with the problem domain but are infeasible in practice as text editing operations constantly involve line reindexing. The pantheon of native text editors use a combination of complex data structures. VSCode, whle running in Electron, uses a Piecetree: https://code.visualstudio.com/blogs/2018/03/23/text-buffer-reimplementation  The piecetree library alone is 10x buffee's entire footprint. Buffee owes its compactness to V8 arrays not being real arrays and hyperoptimized by V8 magic. We can program against an intuitive model and remain compact while getting O(1) cursor/line-wise editor operations 

