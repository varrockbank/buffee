# Claude Instructions for buffee

## Required HTML Structure

See `template.html` for the required HTML structure. Missing any element will cause `Cannot set properties of null` errors.

**When updating `template.html`, also update:**
- `getting-started.html` (HTML-escaped version in `<pre>`)
- `test/lib/harness.js` (createEditorNode function)
- `index.html` (all editor instances)
- `samples/*.html` (all sample files)
- `themes.html`

## Cursor Model (Vim-style)

- **Cursor sits ON a character**, not between characters
- After typing "ABC", cursor is at col 3 (past the last character)
- **Shift+Arrow selects inclusively**: includes current character AND character(s) moved over

## Test Directory Structure

Spec files (in `test/specs/`):

| File | Tests | Look here for |
|------|-------|---------------|
| `spec-core.dsl` | Basic Typing, Backspace, Enter, Complex Sequences | Character input, line breaks, deletions |
| `spec-navigation.dsl` | Cursor Movement, Meta+Arrow, Word Movement | Arrow keys, Home/End, word jumps |
| `spec-selection.dsl` | Selection, Multi-line, Delete/Replace Selection | Shift+arrows, selection rendering |
| `spec-features.dsl` | Gutter, Indentation, Undo/Redo, Unindent | Line numbers, tabs, history |
| `spec-regression.dsl` | Walkthrough, DSL Regression | Edge cases, bug fixes |

Test infrastructure:
- `test/lib/test-runner.js` - TestRunner + EditorTestHarness + Key constants
- `test/lib/test-expect.js` - Assertions (`toBe`, `toEqual`, `toBeCloseTo`)
- `test/lib/test-ui.js` - Test runner UI (SPEC_FILES array defines load order)

**AI Diagnostics tab**: Copy all test failures at once for pasting to Claude.

## Example Prompts for Testing

```
# Run tests and fix failures
Open test/index.html in browser, go to AI Diagnostics tab, copy failures and paste here.

# Add a new test
Add a test for [feature] in spec-[category].dsl

# Debug a specific test
The test "[test name]" is failing with: [error]. Fix it.

# Refactor tests
Move all selection-related tests from spec-core.dsl to spec-selection.dsl
```

## Writing Tests (specs/*.dsl)

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
| FileLoader | `fileloader.js` | Multiple file loading strategies for different sizes |
| UltraHighCapacity | `ultrahighcapacity.js` | Ultra-high-capacity mode for 1B+ lines |

## Generating Sample Pages

Reference existing samples in `samples/`. Show actual JS values in code hints, not generic parameter names.
