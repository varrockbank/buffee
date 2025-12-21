# Gutter resizing

## should not resize gutter when typing from line 9 to line 10
### Regression: Gutter stays stable when crossing single to double digit line count
// Start with empty editor
const $gutter = fixture.node.querySelector(".buffee-gutter");
// Using tolerance because computed style can differ slightly from actual
const gutterWidthPx = () => parseFloat(getComputedStyle($gutter).width);
const initialWidth = gutterWidthPx();
// Initial gutter is 2 digits minimum (3ch with padding) - approximately 43px
expect(initialWidth).toBeCloseTo(43.35);
// Type 9 lines
TYPE "1"
enter
TYPE "2"
enter
TYPE "3"
enter
TYPE "4"
enter
TYPE "5"
enter
TYPE "6"
enter
TYPE "7"
enter
TYPE "8"
enter
TYPE "9"
// Still 9 lines, gutter width should be unchanged
expect(gutterWidthPx()).toBeCloseTo(initialWidth);
// Add line 10
enter
TYPE "10"
// Now 10 lines, gutter should still be same (2 digits fits 10)
expect(gutterWidthPx()).toBeCloseTo(initialWidth);

## should resize gutter based on visible lines
### Gutter based on viewport position, not total lines
// Add 15 lines (more than viewport of 10)
fixture.editor.Model.text = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15";
const $gutter = fixture.node.querySelector(".buffee-gutter");
// Using tolerance because computed style can differ slightly from actual
const gutterWidthPx = () => parseFloat(getComputedStyle($gutter).width);
const initialWidth = gutterWidthPx();
// Viewport shows lines 1-10, largest visible = 10, gutter = 3ch (~43px)
expect(initialWidth).toBeCloseTo(43.35);
// Scroll down - still 2-digit line numbers visible
fixture.editor.Viewport.scroll(2);
expect(gutterWidthPx()).toBeCloseTo(initialWidth);
// Scroll back up
fixture.editor.Viewport.scroll(-2);
expect(gutterWidthPx()).toBeCloseTo(initialWidth);

## should grow gutter when scrolling to 3-digit lines
### Gutter grows from 2 to 3 digits when line 100 is visible
// Create 100 lines
fixture.editor.Model.text = Array(100).fill("x").join("\n");
const $gutter = fixture.node.querySelector(".buffee-gutter");
// Using tolerance because computed style can differ slightly from actual
const gutterWidthPx = () => parseFloat(getComputedStyle($gutter).width);
// Viewport at top shows lines 1-10, gutter = 3ch (2 digits + 1 padding) ~43px
expect(gutterWidthPx()).toBeCloseTo(43.35);
// Navigate to line 100
down 99 times
// Now largest visible = 100 (3 digits), gutter = 4ch ~58px
expect(gutterWidthPx()).toBeCloseTo(57.80);


# Indentation property

## should have default spaces of 4
### Default spaces is 4 spaces
expect(fixture.editor.Mode.spaces).toBe(4);

## should update spaces at runtime
### Setting spaces updates value and display
fixture.editor.Mode.spaces = 2;
expect(fixture.editor.Mode.spaces).toBe(2);

## should allow changing spaces multiple times
### spaces can be changed multiple times
fixture.editor.Mode.spaces = 8;
expect(fixture.editor.Mode.spaces).toBe(8);
fixture.editor.Mode.spaces = 4;
expect(fixture.editor.Mode.spaces).toBe(4);

## should initialize with custom spaces from config
### Config spaces=7 sets initial value
const customNode = document.createElement("div");
customNode.className = "buffee no-select";
customNode.innerHTML = fixture.node.innerHTML;
document.body.appendChild(customNode);
const customEditor = new Buffee(customNode, { spaces: 7 });
expect(customEditor.Mode.spaces).toBe(7);
customNode.remove();


# Unindent

## should only unindent actual leading spaces on middle lines
### Bug: unindent checks charAt(0) instead of charAt(k) for middle lines
// Bug only triggers on middle lines of multi-line selection
// (not first/last)
// Middle line "  x" has 2 leading spaces, indentation=4
// Bug: charAt(0) always ' ', counts all 3 chars as unindentable
//      → "  x".slice(3) = ""
// Fix: charAt(k) checks each position → only 2 spaces
//      → "  x".slice(2) = "x"
fixture.editor.Mode.spaces = 4;
TYPE "     a"
enter
TYPE "  x"
enter
TYPE "    b"
up 2 times
left with meta
down 2 times with shift
right with meta, shift
tab with shift
expect(fixture.editor.Model.lines[0]).toBe(" a");
expect(fixture.editor.Model.lines[1]).toBe("x");
expect(fixture.editor.Model.lines[2]).toBe("b");

