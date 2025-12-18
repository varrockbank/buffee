# Implementation Notes

Technical details for implementers and contributors.

## Indexing

- Buffer exposes Array of lines, which is 0-indexed
- Viewport is 0-indexed
- Selection is absolutely indexed w.r.t Buffer. 

## Conventions

Element variables are prefixed with `$`

## Character Support

Currently, the implementation assumes characters are `1ch` wide in monospace font.
This assumption breaks for 2ch wide kanji. Emojis are 2ch wide on the terminal but do not take a full 2ch in the DOM. Making it 2ch would require wrapping it in a container.

Some monospace fonts also render slightly different from a report `1ch` causing layout drift. 

## Accessibility

Editor captures tab keypresses. This will be an issue for accessibility as
users can't tab out to the next element in the DOM.

## Compatibility

Currently tested and developed around Mac OS keys, namely Meta key. Should not be difficult
to support Windows.

## Clipboard

Paste and copy is not handled through keydown event, as doing so would require calling the
clipboard API access which requires additional security permissions.

### Paste

Simply handling a paste event is sufficient.

### Copy

A dummy textarea was needed as bridge.

## Extensions

Are to be provided by the client:

- Treesitter
- iOS support by proxying to Keyboard events

## Word

Text editors have a notion of a word and the ability to move forward and back a word.
It is necessary to define what a word is. This implementation defines a word as a sequence of:

- alphanumeric
- underscore

Everything else delimits a word. Additionally, every other character is its own word as far
as movement goes. One exception is the space character where a continuous sequence is one
entire word. Tabs are treated as every other character rather than a single white space.
IntelliJ's behavior is a sequence of the same symbol characters is one word, e.g. "===".

Other flavors include:
- Vim has W (versus regular w) mode which treats words as any non-whitespace sequence.
  - This is called WORD-mode instead of word-mode
- Editors can be configured to break words at the capital letter on camelCasing

---

## Horizontal Scrolling

Buffee scrolls the div programmatically. The contents of the div is the viewport 
with all of the textContents. This is opposed to rendering the viewport virtually, trimming 
the in-view strings. 

CSS `transform: translateX()` is an alternative implementation but causes cursor drift due to floating-point accumulation. Native `scrollLeft` is pixel-accurate and scrolls both text and cursor overlay together.

### Keypoints

- Scrolling snaps to whole character widths to maintain grid alignment
- The final snap (`Math.round`) prevents accumulated rounding errors over many scrolls
- Cursor may jitter ±1 pixel at boundaries - this is expected behavior
- Requires `.wb .wb-lines { overflow-x: hidden; }` and `.wb .wb-lines pre { overflow: visible; }`

### Required CSS

```css
.wb .wb-lines { overflow-x: hidden; }
.wb .wb-lines pre { overflow: visible; white-space: pre; }
```

The container uses `overflow-x: hidden` to prevent manual scrolling while allowing programmatic `scrollLeft`. The pre elements use `overflow: visible` so text can extend beyond the container width.

## Font and Cursor Drift

The cursor is positioned using CSS `ch` units, which are based on the width of the "0" character. Some fonts have `ch` values that don't perfectly match their actual character widths, causing cursor drift over long lines.

### Tested Fonts

- **Good:** Menlo, Consolas, `monospace` (generic)
- **Bad:** Monaco

### Testing for Drift

Type "A" 100+ times and move the cursor to the end. If the cursor doesn't align with the text, try a different font.

## Cursor Positioning

The cursor is an overlay div positioned absolutely using `ch` units:

```javascript
$cursor.style.left = head.col + 'ch';
$cursor.style.top = headViewportRow * lineHeight + 'px';
```

This works because:
1. All characters have equal width (monospace font)
2. `ch` unit equals the width of "0" in the current font
3. The cursor and text share the same font settings

## Selection Rendering

Selections use the same `ch` unit positioning as the cursor. Each viewport line has a pre-allocated selection div that gets shown/hidden and resized based on the selection range.
