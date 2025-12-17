# Claude Instructions for buffee

## Required HTML Structure

See `getting-started.html` for the required HTML structure. Missing any element will cause `Cannot set properties of null` errors.

## Cursor Model (Vim-style)

- **Cursor sits ON a character**, not between characters
- After typing "ABC", cursor is at col 3 (past the last character)
- **Shift+Arrow selects inclusively**: includes current character AND character(s) moved over

## Writing Tests (specs.dsl)

- Default viewport is **10 lines**
- Use DSL commands (`TYPE`, `enter`, `left`, `up`) not direct API calls
- Modifiers: `with meta`, `with shift`, `with alt` (can combine: `right with meta, shift`)
- Coordinates are **absolute 0-indexed**: `EXPECT cursor at row,col`

```
## should describe what the test verifies
### Short description for walkthrough
TYPE "content"
enter
left with alt
EXPECT cursor at 0,5
```

## Extensions

Located in `extensions/`, tested in "Extensions" tab of `test/index.html`.

| Extension | File | Description |
|-----------|------|-------------|
| Syntax | `syntax.js` | Regex-based syntax highlighting |
| Elementals | `elementals.js` | DOM-based UI elements in overlay layer |
| TUI Legacy | `tui-legacy.js` | Text-based UI via text manipulation |
| ChunkLoader | `chunkloader.js` | Lazy loading for large files |

## Generating Sample Pages

Reference existing samples in `samples/`. Show actual JS values in code hints, not generic parameter names.
