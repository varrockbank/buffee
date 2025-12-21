# Selection

## should select one character forward
### Select one character with Shift+ArrowRight
TYPE "Hello"
left with meta
right with shift
EXPECT selection at 0,0-0,1

## should select one character backward
### Select one character with Shift+ArrowLeft
TYPE "Hello"
left with shift
EXPECT selection at 0,4-0,5

## should select multiple lines downward
### Select multiple lines with Shift+ArrowDown
TYPE "Line 1"
enter
TYPE "Line 2"
up
left with meta
down with shift
EXPECT selection at 0,0-1,0

## should move cursor up without creating selection
### Move cursor up without selection
TYPE "Line 1"
enter
TYPE "Line 2"
up
EXPECT cursor at 0,6

## should select upward with Shift+ArrowUp
### Select upward with Shift+ArrowUp
TYPE "Line 1"
enter
TYPE "Line 2"
up with shift
EXPECT selection at 0,6-1,6

## should extend selection with multiple Shift+Arrow keys
### Extend selection with multiple Shift+Arrow
TYPE "Hello World"
left with meta
right 5 times with shift
EXPECT selection at 0,0-0,5

## should return correct order for forward and backward selections
### Regression: Selection.ordered returns correct order for forward/backward selections
TYPE "Hello World"
left with meta
right 5 times with shift
expect(fixture.editor.Selection.isForwardSelection).toBe(true);
EXPECT selection at 0,0-0,5
right with meta
left 5 times with shift
expect(fixture.editor.Selection.isForwardSelection).toBe(false);
EXPECT selection at 0,6-0,11

## should show head position in status line during selection
### Regression: Status line shows active cursor (head), not anchor (tail)
TYPE "Hello World"
left with meta
right 5 times with shift
// Forward selection: tail at col 0, head at col 5
EXPECT selection at 0,0-0,5
const $row = fixture.node.querySelector('.buffee-head-row');
const $col = fixture.node.querySelector('.buffee-head-col');
expect($row.innerHTML).toBe("1");
expect($col.innerHTML).toBe("6");
// Backward selection: tail at col 11, head at col 6
right with meta
left 5 times with shift
EXPECT selection at 0,6-0,11
expect($row.innerHTML).toBe("1");
expect($col.innerHTML).toBe("7");


# Multi-line selections

## should select 3 rows from middle to middle
### Select 3 rows: middle to middle
TYPE "First line here"
enter
TYPE "Second line here"
enter
TYPE "Third line here"
enter
TYPE "Fourth line here"
up 3 times
left with meta
right 6 times
down 2 times with shift
EXPECT selection at 0,6-2,6

## should select 3 rows from beginning to end
### Select 3 rows: beginning to end
TYPE "First line here"
enter
TYPE "Second line here"
enter
TYPE "Third line here"
up 2 times
left with meta
down 2 times with shift
right with meta, shift
EXPECT selection at 0,0-2,15

## should select 3 rows from end of line to middle
### Select 3 rows: end of line to middle
TYPE "First"
enter
TYPE "Second line here"
enter
TYPE "Third line here"
up 2 times
right with meta
down 2 times with shift
EXPECT selection at 0,5-2,5

## should select 3 rows from middle to beginning
### Select 3 rows: middle to beginning
TYPE "First line here"
enter
TYPE "Second line here"
enter
TYPE "Third line here"
up 2 times
left with meta
right 6 times
down 2 times with shift
left with meta, shift
EXPECT selection at 0,6-2,0

## should select from last character and extend down
### Select from last character and extend down
TYPE "First"
enter
TYPE "Second"
enter
TYPE "Third"
up 2 times
left
right with shift
// Selection at 0,4-0,5 (last char + phantom newline)
EXPECT selection at 0,4-0,5
down with shift
// Head moves to row 1 "Second" (length 6), col stays at 5
EXPECT selection at 0,4-1,5

## should select down 4 rows from beginning
### Select down 4 rows from beginning
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
enter
TYPE "Line 4"
enter
TYPE "Line 5"
enter
TYPE "Line 6"
up 5 times
left with meta
down 4 times with shift
EXPECT selection at 0,0-4,0

## should select right 3 columns
### Select right 3 columns
TYPE "Hello World"
enter
TYPE "Second line"
up
left with meta
right 3 times with shift
EXPECT selection at 0,0-0,3

## should select down 4 rows then right 3 columns
### Select down 4 rows then right 3 columns
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
enter
TYPE "Line 4"
enter
TYPE "Line 5 with more text"
up 4 times
left with meta
down 4 times with shift
right 3 times with shift
EXPECT selection at 0,0-4,3

## should select from middle down 4 rows then right 3 columns
### Select from middle down 4 rows then right 3 columns
TYPE "Line 1 text"
enter
TYPE "Line 2 text"
enter
TYPE "Line 3 text"
enter
TYPE "Line 4 text"
enter
TYPE "Line 5 with more text"
up 4 times
left with meta
right 5 times
down 4 times with shift
right 3 times with shift
EXPECT selection at 0,5-4,8


# Deleting selections

## should delete partial text from line
### Delete 'Hello' from 'Hello World'
TYPE "Hello World"
left with meta
right 5 times with shift
backspace
expect(fixture).toHaveLines(' World');
EXPECT cursor at 0,0

## should delete entire line
### Delete entire line
TYPE "Delete me"
left with meta, shift
backspace
expect(fixture).toHaveLines('');
EXPECT cursor at 0,0

## should delete two full lines plus first character
### Delete two full lines plus first character
TYPE "First line"
enter
TYPE "Second line"
enter
TYPE "Third line"
up 2 times
left with meta
down 2 times with shift
backspace
expect(fixture).toHaveLines('Third line');
EXPECT cursor at 0,0

## should delete partial multi-line selection
### Delete partial multi-line selection
TYPE "First line here"
enter
TYPE "Second line here"
enter
TYPE "Third line here"
up 2 times
left with meta
right 6 times
down 2 times with shift
backspace
expect(fixture).toHaveLines('First line here');
EXPECT cursor at 0,6

## should delete from middle to end across lines
### Delete from middle to end across lines
TYPE "First line"
enter
TYPE "Second line"
up
left with meta
right 6 times
down with shift
right with meta, shift
backspace
expect(fixture).toHaveLines('First ');
EXPECT cursor at 0,6

## should delete backward selection
### Delete backward selection
TYPE "Hello World"
left 5 times with shift
backspace
expect(fixture).toHaveLines('Hello ');
EXPECT cursor at 0,6


# Replacing selections

## should replace partial text with single character
### Replace 'Hello' with 'X'
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "X"
expect(fixture).toHaveLines('X World');
EXPECT cursor at 0,1

## should replace partial text with word
### Replace 'Hello' with 'Goodbye'
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "Goodbye"
expect(fixture).toHaveLines('Goodbye World');
EXPECT cursor at 0,7

## should replace entire line
### Replace entire line
TYPE "Old text"
left with meta
right with meta, shift
TYPE "New"
expect(fixture).toHaveLines('New');
EXPECT cursor at 0,3

## should replace multi-line selection with single character
### Replace multi-line selection with 'X'
TYPE "First line"
enter
TYPE "Second line"
enter
TYPE "Third line"
up 2 times
left with meta
down 2 times with shift
TYPE "X"
expect(fixture).toHaveLines('XThird line');
EXPECT cursor at 0,1

## should replace partial multi-line with text
### Replace partial multi-line with text
TYPE "First line"
enter
TYPE "Second line"
enter
TYPE "Third line"
up 2 times
left with meta
right 6 times
down 2 times with shift
TYPE "REPLACED"
expect(fixture).toHaveLines('First REPLACEDline');
EXPECT cursor at 0,14

## should replace backward selection
### Replace backward selection
TYPE "Hello World"
left 5 times with shift
TYPE "Everyone"
expect(fixture).toHaveLines('Hello Everyone');
EXPECT cursor at 0,14

## should replace selection with space
### Replace 'World' with space
TYPE "HelloWorld"
left with meta
right 5 times
right 5 times with shift
PRESS " "
expect(fixture).toHaveLines('Hello ');
EXPECT cursor at 0,6


# Regression: Selection.ordered and isForwardSelection

## should return true for isForwardSelection when tail is before head
### isForwardSelection true when tail < head
TYPE "Hello"
left with meta
right 3 times with shift
expect(fixture.editor.Selection.isForwardSelection).toBe(true);

## should return false for isForwardSelection when head is before tail
### isForwardSelection false when head < tail
TYPE "Hello"
left 3 times with shift
expect(fixture.editor.Selection.isForwardSelection).toBe(false);

## should use head.row when clamping column after moving head
### Uses head.row when clamping column after moving head
TYPE "a"
enter
TYPE "bar"
left 3 times with shift
up with shift
EXPECT selection at 0,0-1,3

## should use head.row not tail.row when moving head down
### Clamps using head.row when head moves to shorter line
TYPE "Short"
enter
TYPE "A"
enter
TYPE "Long line"
up 2 times
left with meta
right 5 times with shift
// Selection at 0,0-0,5 (includes phantom newline)
EXPECT selection at 0,0-0,5
down with shift
// Head moves to row 1 "A" (length 1), col clamped to 1
EXPECT selection at 0,0-1,1


# Selection rendering

## should show cursor on empty line
### Regression: Cursor visible on empty line via .buffee-cursor
// Empty editor, cursor at 0,0 should render via .buffee-cursor (selection width=0)
const $cursor = fixture.node.querySelector(".buffee-cursor");
expect($cursor.style.visibility).toBe("visible");

## should show cursor after typing
### Regression: Cursor visible after typing text via .buffee-cursor
TYPE "Hello"
const $cursor = fixture.node.querySelector(".buffee-cursor");
expect($cursor.style.visibility).toBe("visible");

## should not show phantom newline when no newline exists
### Regression: Single line with no newline shows selection excluding cursor
TYPE "Hello"
left with meta
right 5 times with shift
// Selection from col 0 to col 5 on "Hello" (len 5), no second line
// Should show 5ch (selection excludes cursor head position)
const $sel = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel.style.width).toBe("5ch");

## should show selection excluding cursor when selecting forward to EOL with newline
### Regression: Forward selection to EOL excludes cursor head position
TYPE "Hello"
enter
TYPE "World"
up
left with meta
right 5 times with shift
// Selection from col 0 to col 5 on "Hello" (len 5), with newline after
// Selection excludes cursor head, shows 5ch
const $sel = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel.style.width).toBe("5ch");

## should not show phantom newline when selecting backward from EOL (no newline)
### Regression: Backward selection from EOL excludes phantom (single line)
TYPE "Hello"
left with shift
// Selection from col 4 to col 5, but selecting LEFT from col 5
// Backward selection should show 1ch (just "o", no phantom)
const $sel = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel.style.width).toBe("1ch");

## should not show phantom newline when selecting backward from EOL (with newline)
### Regression: Backward selection from EOL excludes phantom even when newline exists
TYPE "Hello"
enter
TYPE "World"
up
right with meta
left with shift
// On first line "Hello" with newline, select backward from col 5 to col 4
// Backward selection should show 1ch (just "o", not the newline)
const $sel = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel.style.width).toBe("1ch");

## should show phantom newline on first line of multi-line selection
### Regression: Multi-line selection first line includes phantom newline
TYPE "Hello"
enter
TYPE "World"
up
left with meta
down with shift
// First line "Hello" from col 0 should show 6ch (5 chars + phantom)
const $sel0 = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel0.style.width).toBe("6ch");

## should show phantom newline on middle lines of multi-line selection
### Regression: Multi-line selection middle lines include phantom newline
TYPE "First"
enter
TYPE "Middle"
enter
TYPE "Last"
up 2 times
left with meta
down 2 times with shift
// Middle line "Middle" (row 1) should show 7ch (6 chars + phantom)
const $sel1 = fixture.node.querySelectorAll(".buffee-selection")[1];
expect($sel1.style.width).toBe("7ch");

## should select newline before wrapping to next line
### Regression: Selecting right at EOL selects newline first, then wraps
TYPE "Hello"
enter
TYPE "a"
up
left with meta
// Select "Hell" (4 chars): 4 shift+rights from col 0 to col 4
right 4 times with shift
EXPECT selection at 0,0-0,4
const $sel4 = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel4.style.width).toBe("4ch");
// Select one more (col 5, still on row 0)
right with shift
EXPECT selection at 0,0-0,5
const $sel5 = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel5.style.width).toBe("5ch");
// Select one more to wrap to next line (row 1, col 0)
right with shift
EXPECT selection at 0,0-1,0
// Select one more to include "a"
right with shift
EXPECT selection at 0,0-1,1

## should show last line of multi-line selection excluding cursor
### Regression: Multi-line selection last line excludes cursor head position
TYPE "a"
enter
TYPE "b"
enter
TYPE "c"
up 2 times
right with meta
// Cursor at col 1 row 0 (phantom position of "a")
// Select right: wrap to row 1 col 0
right with shift
EXPECT selection at 0,1-1,0
const $r0a = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($r0a.style.width).toBe("1ch");
const $r1a = fixture.node.querySelectorAll(".buffee-selection")[1];
expect($r1a.style.width).toBe("0ch");
// Select right again: row 1 col 1 (phantom position of "b")
right with shift
EXPECT selection at 0,1-1,1
const $r0b = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($r0b.style.width).toBe("1ch");
const $r1b = fixture.node.querySelectorAll(".buffee-selection")[1];
expect($r1b.style.width).toBe("1ch");
// Select right again: wrap to row 2
right with shift
EXPECT selection at 0,1-2,0

## should delete text and newline when selection includes phantom
### Regression: Deleting selection that includes phantom newline joins lines
TYPE "a"
enter
TYPE "b"
up
left with meta
// Select "a" + phantom newline (col 0 to col 1)
right with shift
EXPECT selection at 0,0-0,1
// Delete should remove "a" and the newline, leaving just "b" on line 0
backspace
expect(fixture).toHaveLines("b");
EXPECT cursor at 0,0


# Selection larger than viewport

## should support selection spanning more lines than viewport
### Selection can span beyond viewport size (viewport=10)
// Add 15 lines
TYPE "line0"
enter
TYPE "line1"
enter
TYPE "line2"
enter
TYPE "line3"
enter
TYPE "line4"
enter
TYPE "line5"
enter
TYPE "line6"
enter
TYPE "line7"
enter
TYPE "line8"
enter
TYPE "line9"
enter
TYPE "line10"
enter
TYPE "line11"
enter
TYPE "line12"
enter
TYPE "line13"
enter
TYPE "line14"
// Go to beginning
up 14 times
left with meta
expect(fixture.editor.Viewport.start).toBe(0);
EXPECT cursor at 0,0
// Select down 12 lines (more than viewport of 10)
down 12 times with shift
EXPECT selection at 0,0-12,0
// Selection spans lines 0-12 but viewport only shows 10 lines

## should render selection edges correctly before and after viewport scrolls
### Selection tail ends change shape when viewport scrolls
// Add 15 lines
TYPE "FIRST"
enter
TYPE "line1"
enter
TYPE "line2"
enter
TYPE "line3"
enter
TYPE "line4"
enter
TYPE "line5"
enter
TYPE "line6"
enter
TYPE "line7"
enter
TYPE "line8"
enter
TYPE "line9"
enter
TYPE "line10"
enter
TYPE "line11"
enter
TYPE "line12"
enter
TYPE "LAST"
enter
TYPE "after"
// Go to start, move to col 2
up 14 times
left with meta
right 2 times
expect(fixture.editor.Viewport.start).toBe(0);
// Select down 5 rows (stays within viewport of 10)
down 5 times with shift
EXPECT selection at 0,2-5,2
// First edge at row 0 should start at col 2
const $sel0 = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($sel0.style.left).toBe("2ch");
expect($sel0.style.width).toBe("4ch");
// Middle lines (rows 1-4) should be full width (left: 0)
const $sel2 = fixture.node.querySelectorAll(".buffee-selection")[2];
expect($sel2.style.left).toBe("0ch");
expect($sel2.style.width).toBe("6ch");
// Continue selecting down 8 more rows - this will scroll the viewport
down 8 times with shift
right 2 times with shift
EXPECT selection at 0,2-13,4
// Viewport scrolled to keep head visible (row 13)
// Viewport.start = 13 - 10 + 1 = 4, showing rows 4-13
expect(fixture.editor.Viewport.start).toBe(4);
// First edge (row 0) is now ABOVE viewport - not rendered
// Row 4 is viewport row 0, rendered as middle line (full width)
const $vp0 = fixture.node.querySelectorAll(".buffee-selection")[0];
expect($vp0.style.left).toBe("0ch");
expect($vp0.style.width).toBe("6ch");
// Row 13 is viewport row 9 (last line of selection, excludes cursor head)
const $vp9 = fixture.node.querySelectorAll(".buffee-selection")[9];
expect($vp9.style.left).toBe("0ch");
expect($vp9.style.width).toBe("4ch");

