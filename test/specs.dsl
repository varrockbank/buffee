# Basic Typing

## should insert single character
### Insert single character 'a'
PRESS a
expect(fixture).toHaveLines('a');
EXPECT cursor at 0,1

## should insert word 'Hello'
### Insert 'Hello'
TYPE "Hello"
expect(fixture).toHaveLines('Hello');
EXPECT cursor at 0,5

## should insert phrase with spaces
### Insert 'Hello World' with spaces
TYPE "Hello World"
expect(fixture).toHaveLines('Hello World');

## should insert sentence
### Insert sentence 'The quick brown fox'
TYPE "The quick brown fox"
expect(fixture).toHaveLines('The quick brown fox');


# Backspace

## should delete single character
### Delete single char from 'Hello' → 'Hell'
TYPE "Hello"
backspace
expect(fixture).toHaveLines('Hell');

## should delete multiple characters
### Delete 3 chars from 'Hello' → 'He'
TYPE "Hello"
backspace 3 times
expect(fixture).toHaveLines('He');

## should delete all characters leaving empty line
### Delete all chars from 'Hi' → ''
TYPE "Hi"
backspace 2 times
expect(fixture).toHaveLines('');

## should delete from middle of text
### Delete from middle: 'Hello' → 'Helo'
TYPE "Hello"
left 2 times
backspace
expect(fixture).toHaveLines('Helo');
EXPECT cursor at 0,2

## should delete multiple characters from middle
### Delete 2 chars from middle
TYPE "Hello World"
left 6 times
backspace 2 times
expect(fixture).toHaveLines('Hel World');
EXPECT cursor at 0,3

## should stop at line start when backspacing
### Backspace beyond line start
TYPE "Hi"
backspace 5 times
expect(fixture).toHaveLines('');
EXPECT cursor at 0,0


# Enter Key

## should create new line
### Create new line: 'Hello'[Enter] → 2 lines
TYPE "Hello"
enter
expect(fixture).toHaveLines('Hello', '');

## should create multiple lines
### Create multiple lines: 'Line 1'[Enter]'Line 2'[Enter]'Line 3' → 3 lines
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
expect(fixture).toHaveLines('Line 1', 'Line 2', 'Line 3');

## should split line at cursor position
### Split line: 'Hello'[ArrowLeft×2][Enter] → 'Hel' and 'lo'
TYPE "Hello"
left
left
enter
expect(fixture).toHaveLines('Hel', 'lo');

## should create new line at end of file
### Enter at end of file creates new line
TYPE "First line"
enter
TYPE "Second line"
enter
expect(fixture).toHaveLines('First line', 'Second line', '');
EXPECT cursor at 2,0

## should create multiple empty lines
### Create multiple empty lines from empty document
enter 5 times
expect(fixture).toHaveLines('', '', '', '', '', '');
EXPECT cursor at 5,0


# Complex Sequences

## should handle type, delete, retype sequence
### Type, delete, retype
TYPE "Hello"
backspace 2 times
TYPE "y there"
expect(fixture).toHaveLines('Hely there');

## should create and delete line breaks
### Create/delete line breaks
TYPE "Hello"
enter
TYPE "World"
backspace 6 times
expect(fixture).toHaveLines('Hello');

## should support multi-line editing
### Multi-line editing
TYPE "First"
enter
TYPE "Second"
up
TYPE " Line"
expect(fixture).toHaveLines('First Line', 'Second');

## should delete across line boundaries
### Delete across boundaries
TYPE "Hello"
enter
TYPE "World"
left with meta
backspace
expect(fixture).toHaveLines('HelloWorld');
EXPECT cursor at 0,5

## should edit at end of middle line
### Edit at end of middle line
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
up
TYPE " edited"
expect(fixture).toHaveLines('Line 1', 'Line 2 edited', 'Line 3');

## should edit at middle of middle line
### Edit at middle of middle line
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
up
left with meta
right 3 times
TYPE "X"
expect(fixture).toHaveLines('Line 1', 'LinXe 2', 'Line 3');


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
expect(fixture.wb.Selection.isForwardSelection).toBe(true);
EXPECT selection at 0,0-0,5
right with meta
left 5 times with shift
expect(fixture.wb.Selection.isForwardSelection).toBe(false);
EXPECT selection at 0,6-0,11

## should show head position in status line during selection
### Regression: Status line shows active cursor (head), not anchor (tail)
TYPE "Hello World"
left with meta
right 5 times with shift
// Forward selection: tail at col 0, head at col 5
EXPECT selection at 0,0-0,5
const $row = fixture.node.querySelector('.wb-head-row');
const $col = fixture.node.querySelector('.wb-head-col');
expect($row.innerHTML).toBe("1");
expect($col.innerHTML).toBe("6");
// Backward selection: tail at col 11, head at col 6
right with meta
left 5 times with shift
EXPECT selection at 0,6-0,11
expect($row.innerHTML).toBe("1");
expect($col.innerHTML).toBe("7");


# Cursor movement - varying line lengths

## should clamp cursor to end of shorter line
### Long to short: cursor at end of short line
TYPE "Short"
enter
TYPE "Much longer line"
up
EXPECT cursor at 0,5

## should restore original column when moving back
### Should restore original column when moving back
TYPE "Short"
enter
TYPE "Much longer line"
EXPECT cursor at 1,16
up
down
EXPECT cursor at 1,16

## should clamp to shorter line end
### Clamp to shorter line end
TYPE "A"
enter
TYPE "Very long line here"
up
EXPECT cursor at 0,1

## should navigate multiple lines with varying lengths
### Multiple lines with varying lengths
TYPE "Line one"
enter
TYPE "Two"
enter
TYPE "Line three is longest"
up
up
EXPECT cursor at 0,8

## should move from middle of long line to end of short line
### Move from middle of long line to end of short line
TYPE "Short"
enter
TYPE "This is a much longer line"
left with meta
right 10 times
up
EXPECT cursor at 0,5

## should navigate from medium line to short and long lines
### Navigate from medium line to short and long lines
TYPE "Short"
enter
TYPE "Medium!!"
enter
TYPE "Longest!!!"
up
left with meta
right 8 times
up
EXPECT cursor at 0,5
down
down
EXPECT cursor at 2,8

## should navigate from medium line to short and long lines with natural typing
### Navigate from medium line to short and long lines (natural typing)
TYPE "Short"
enter
TYPE "Medium!!"
enter
TYPE "Longest!!!"
up
right with meta
up
EXPECT cursor at 0,5
down
down
EXPECT cursor at 2,8

## should move left from col 0 to phantom newline position
### Move left from start of line goes to phantom newline
TYPE "Hello"
enter
TYPE "World"
left with meta
EXPECT cursor at 1,0
left
EXPECT cursor at 0,5

## should restore phantom newline position when moving back to long line
### Long to short to long restores phantom newline
TYPE "Hello World"
enter
TYPE "Hi"
up
EXPECT cursor at 0,2
down
EXPECT cursor at 1,2
up
EXPECT cursor at 0,2
right with meta
EXPECT cursor at 0,11
down
EXPECT cursor at 1,2
up
EXPECT cursor at 0,11

## should restore phantom newline position when moving back to short line
### Short to long to short restores phantom newline
TYPE "Hi"
enter
TYPE "Hello World"
up
EXPECT cursor at 0,2
down
EXPECT cursor at 1,11
up
EXPECT cursor at 0,2


# Meta+Arrow navigation

## should move to end of line with Meta+Right
### Meta+Right moves to end of line
TYPE "Hello World"
left with meta
EXPECT cursor at 0,0
right with meta
EXPECT cursor at 0,11

## should move to start of line with Meta+Left from middle
### Meta+Left from middle of line
TYPE "Hello World"
left 3 times
left with meta
EXPECT cursor at 0,0

## should move to end of line with Meta+Right from middle
### Meta+Right from middle of line
TYPE "Hello World"
left 3 times
right with meta
EXPECT cursor at 0,11

## should use Meta+Left and Meta+Right on second line
### Meta+Left/Right on second line
TYPE "First line"
enter
TYPE "Second line here"
left with meta
EXPECT cursor at 1,0
right with meta
EXPECT cursor at 1,16

## should use Meta+Right after moving between lines
### Meta+Right after moving between lines
TYPE "Short"
enter
TYPE "Much longer line"
up
right with meta
EXPECT cursor at 0,5


# Shift+Meta+Arrow selection

## should select to end of line with Shift+Meta+Right
### Shift+Meta+Right selects to end of line
TYPE "Hello World"
left with meta
right with meta, shift
EXPECT selection at 0,0-0,11

## should select to start of line with Shift+Meta+Left
### Shift+Meta+Left selects to start of line
TYPE "Hello World"
left with meta, shift
EXPECT selection at 0,0-0,11

## should select from middle to end with Shift+Meta+Right
### Shift+Meta+Right from middle selects to end
TYPE "Hello World"
left 3 times
right with meta, shift
EXPECT selection at 0,8-0,11

## should select from middle to start with Shift+Meta+Left
### Shift+Meta+Left from middle selects to start
TYPE "Hello World"
left 3 times
left with meta, shift
EXPECT selection at 0,0-0,8

## should select to start of second line with Shift+Meta+Left
### Shift+Meta+Left on second line
TYPE "First line"
enter
TYPE "Second line here"
left with meta, shift
EXPECT selection at 1,0-1,16

## should extend selection to end with Shift+Meta+Right
### Extend selection to end with Shift+Meta+Right
TYPE "Hello World Here"
left with meta
right 2 times with shift
right with meta, shift
EXPECT selection at 0,0-0,16


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
expect(fixture.wb.Selection.isForwardSelection).toBe(true);

## should return false for isForwardSelection when head is before tail
### isForwardSelection false when head < tail
TYPE "Hello"
left 3 times with shift
expect(fixture.wb.Selection.isForwardSelection).toBe(false);

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


# Walkthrough feature - regression tests

## should demonstrate interleaved success and failure expects
### Interleaved success/fail expects for walkthrough testing
TYPE "First line"
// Intentional fail for walkthrough demo
expect(1).toEqual(null);
enter
// Intentional success for walkthrough demo
expect(1).toBe(1);
TYPE "Second line"
// Intentional fail for walkthrough demo
expect(1).toBe(3);
left with meta
// Intentional success for walkthrough demo
expect(5).toBe(5);


# DSL regression tests

## should handle pressing semicolon
### PRESS ';' should produce ';'
PRESS ';'
expect(fixture).toHaveLines(';');
EXPECT cursor at 0,1

## should handle pressing semicolon multiple times
### PRESS ';' 3 times should produce ';;;'
PRESS ';' 3 times
expect(fixture).toHaveLines(';;;');
EXPECT cursor at 0,3


# Word movement

## should scroll viewport up when moveBackWord at first viewport line
### Alt+Left at col 0, row 0 scrolls viewport up
// Add 11 lines (viewport shows 10, so we can scroll)
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
// Cursor at end of last line, viewport scrolled down
expect(fixture.wb.Viewport.start).toBe(1);
// Move cursor to start of first viewport line (line1 = absolute row 1)
up 9 times
left with meta
EXPECT cursor at 1,0
// Alt+Left should scroll viewport up and move cursor to end of line0
left with alt
expect(fixture.wb.Viewport.start).toBe(0);
EXPECT cursor at 0,5

## should scroll viewport down when moveWord at last viewport line
### Alt+Right at end of last viewport line scrolls viewport down
// Add 15 lines (viewport shows 10, need content below)
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
// Go back to beginning
up 14 times
left with meta
expect(fixture.wb.Viewport.start).toBe(0);
EXPECT cursor at 0,0
// Navigate to end of line9 (last visible row, with lines 10-14 below)
down 9 times
right with meta
EXPECT cursor at 9,5
// Alt+Right should scroll viewport down and move cursor to start of line10
right with alt
expect(fixture.wb.Viewport.start).toBe(1);
EXPECT cursor at 10,0

## should not move when moveWord at end of file
### Alt+Right at end of file does nothing
TYPE "only line"
right with meta
EXPECT cursor at 0,9
// Alt+Right at end of file should do nothing
right with alt
EXPECT cursor at 0,9

## should not scroll viewport negative when pressing up at first line
### Regression: Up at first line of file does not scroll viewport negative
// Empty editor, cursor at 0,0
EXPECT cursor at 0,0
expect(fixture.wb.Viewport.start).toBe(0);
// Press up - should be no-op
up
expect(fixture.wb.Viewport.start).toBe(0);
EXPECT cursor at 0,0


# Gutter resizing

## should not resize gutter when typing from line 9 to line 10
### Regression: Gutter stays stable when crossing single to double digit line count
// Start with empty editor
const $gutter = fixture.node.querySelector(".wb-gutter");
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
fixture.wb.Model.text = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15";
const $gutter = fixture.node.querySelector(".wb-gutter");
// Using tolerance because computed style can differ slightly from actual
const gutterWidthPx = () => parseFloat(getComputedStyle($gutter).width);
const initialWidth = gutterWidthPx();
// Viewport shows lines 1-10, largest visible = 10, gutter = 3ch (~43px)
expect(initialWidth).toBeCloseTo(43.35);
// Scroll down - still 2-digit line numbers visible
fixture.wb.Viewport.scroll(2);
expect(gutterWidthPx()).toBeCloseTo(initialWidth);
// Scroll back up
fixture.wb.Viewport.scroll(-2);
expect(gutterWidthPx()).toBeCloseTo(initialWidth);

## should grow gutter when scrolling to 3-digit lines
### Gutter grows from 2 to 3 digits when line 100 is visible
// Create 100 lines
fixture.wb.Model.text = Array(100).fill("x").join("\n");
const $gutter = fixture.node.querySelector(".wb-gutter");
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
expect(fixture.wb.Mode.spaces).toBe(4);

## should update spaces at runtime
### Setting spaces updates value and display
fixture.wb.Mode.spaces = 2;
expect(fixture.wb.Mode.spaces).toBe(2);

## should allow changing spaces multiple times
### spaces can be changed multiple times
fixture.wb.Mode.spaces = 8;
expect(fixture.wb.Mode.spaces).toBe(8);
fixture.wb.Mode.spaces = 4;
expect(fixture.wb.Mode.spaces).toBe(4);

## should initialize with custom spaces from config
### Config spaces=7 sets initial value
const customNode = document.createElement("div");
customNode.className = "wb no-select";
customNode.innerHTML = fixture.node.innerHTML;
document.body.appendChild(customNode);
const customEditor = new Buffee(customNode, { spaces: 7 });
expect(customEditor.Mode.spaces).toBe(7);
customNode.remove();


# NewLine with selection

## should replace selection with newline
### NewLine with selection deletes selection and inserts newline
TYPE "ABC"
left 2 times
left with shift
enter
expect(fixture).toHaveLines("", "BC");
EXPECT cursor at 1,0


# Undo/Redo

## should undo single character insert
### Undo single character insert
TYPE "A"
expect(fixture).toHaveLines("A");
fixture.wb.History.undo();
expect(fixture).toHaveLines("");

## should redo single character insert
### Redo single character insert
TYPE "A"
fixture.wb.History.undo();
expect(fixture).toHaveLines("");
fixture.wb.History.redo();
expect(fixture).toHaveLines("A");

## should undo coalesced characters
### Undo coalesced character inserts (typed quickly = one undo)
TYPE "ABC"
fixture.wb.History.undo();
expect(fixture).toHaveLines("");

## should undo backspace
### Undo backspace restores deleted character
TYPE "AB"
backspace
expect(fixture).toHaveLines("A");
fixture.wb.History.undo();
expect(fixture).toHaveLines("AB");

## should undo newline
### Undo newline joins lines back together
TYPE "Hello"
enter
TYPE "World"
expect(fixture).toHaveLines("Hello", "World");
fixture.wb.History.undo();
expect(fixture).toHaveLines("Hello", "");
fixture.wb.History.undo();
expect(fixture).toHaveLines("Hello");

## should undo delete at start of line (join lines)
### Undo backspace at line start restores newline
TYPE "AB"
enter
backspace
expect(fixture).toHaveLines("AB");
fixture.wb.History.undo();
expect(fixture).toHaveLines("AB", "");

## should clear redo stack on new edit
### New edit clears redo stack
TYPE "A"
fixture.wb.History.undo();
expect(fixture.wb.History.redoStack.length).toBe(1);
TYPE "B"
expect(fixture.wb.History.redoStack.length).toBe(0);

## should restore cursor position on undo
### Undo restores cursor to position before edit (coalesced)
TYPE "Hello"
EXPECT cursor at 0,5
fixture.wb.History.undo();
EXPECT cursor at 0,0

## should restore cursor position on redo
### Redo restores cursor to position after edit (coalesced)
TYPE "AB"
fixture.wb.History.undo();
EXPECT cursor at 0,0
fixture.wb.History.redo();
EXPECT cursor at 0,2

## should restore cursor and selection on undo delete selection
### Regression: Undo delete selection restores cursor to original selection start
TYPE "Hello World"
left with meta
right 5 times with shift
backspace
expect(fixture).toHaveLines(" World");
EXPECT cursor at 0,0
fixture.wb.History.undo();
expect(fixture).toHaveLines("Hello World");
EXPECT cursor at 0,0

## should undo replace selection in one step
### Regression: Replace selection (delete+insert) undoes atomically
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "X"
expect(fixture).toHaveLines("X World");
EXPECT cursor at 0,1
fixture.wb.History.undo();
expect(fixture).toHaveLines("Hello World");
EXPECT cursor at 0,0


# Selection rendering

## should show cursor on empty line
### Regression: Cursor visible on empty line via .wb-cursor
// Empty editor, cursor at 0,0 should render via .wb-cursor (selection width=0)
const $cursor = fixture.node.querySelector(".wb-cursor");
expect($cursor.style.visibility).toBe("visible");

## should show cursor after typing
### Regression: Cursor visible after typing text via .wb-cursor
TYPE "Hello"
const $cursor = fixture.node.querySelector(".wb-cursor");
expect($cursor.style.visibility).toBe("visible");

## should not show phantom newline when no newline exists
### Regression: Single line with no newline shows selection excluding cursor
TYPE "Hello"
left with meta
right 5 times with shift
// Selection from col 0 to col 5 on "Hello" (len 5), no second line
// Should show 5ch (selection excludes cursor head position)
const $sel = fixture.node.querySelectorAll(".wb-selection")[0];
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
const $sel = fixture.node.querySelectorAll(".wb-selection")[0];
expect($sel.style.width).toBe("5ch");

## should not show phantom newline when selecting backward from EOL (no newline)
### Regression: Backward selection from EOL excludes phantom (single line)
TYPE "Hello"
left with shift
// Selection from col 4 to col 5, but selecting LEFT from col 5
// Backward selection should show 1ch (just "o", no phantom)
const $sel = fixture.node.querySelectorAll(".wb-selection")[0];
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
const $sel = fixture.node.querySelectorAll(".wb-selection")[0];
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
const $sel0 = fixture.node.querySelectorAll(".wb-selection")[0];
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
const $sel1 = fixture.node.querySelectorAll(".wb-selection")[1];
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
const $sel4 = fixture.node.querySelectorAll(".wb-selection")[0];
expect($sel4.style.width).toBe("4ch");
// Select one more (col 5, still on row 0)
right with shift
EXPECT selection at 0,0-0,5
const $sel5 = fixture.node.querySelectorAll(".wb-selection")[0];
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
const $r0a = fixture.node.querySelectorAll(".wb-selection")[0];
expect($r0a.style.width).toBe("1ch");
const $r1a = fixture.node.querySelectorAll(".wb-selection")[1];
expect($r1a.style.width).toBe("0ch");
// Select right again: row 1 col 1 (phantom position of "b")
right with shift
EXPECT selection at 0,1-1,1
const $r0b = fixture.node.querySelectorAll(".wb-selection")[0];
expect($r0b.style.width).toBe("1ch");
const $r1b = fixture.node.querySelectorAll(".wb-selection")[1];
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
expect(fixture.wb.Viewport.start).toBe(0);
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
expect(fixture.wb.Viewport.start).toBe(0);
// Select down 5 rows (stays within viewport of 10)
down 5 times with shift
EXPECT selection at 0,2-5,2
// First edge at row 0 should start at col 2
const $sel0 = fixture.node.querySelectorAll(".wb-selection")[0];
expect($sel0.style.left).toBe("2ch");
expect($sel0.style.width).toBe("4ch");
// Middle lines (rows 1-4) should be full width (left: 0)
const $sel2 = fixture.node.querySelectorAll(".wb-selection")[2];
expect($sel2.style.left).toBe("0ch");
expect($sel2.style.width).toBe("6ch");
// Continue selecting down 8 more rows - this will scroll the viewport
down 8 times with shift
right 2 times with shift
EXPECT selection at 0,2-13,4
// Viewport scrolled to keep head visible (row 13)
// Viewport.start = 13 - 10 + 1 = 4, showing rows 4-13
expect(fixture.wb.Viewport.start).toBe(4);
// First edge (row 0) is now ABOVE viewport - not rendered
// Row 4 is viewport row 0, rendered as middle line (full width)
const $vp0 = fixture.node.querySelectorAll(".wb-selection")[0];
expect($vp0.style.left).toBe("0ch");
expect($vp0.style.width).toBe("6ch");
// Row 13 is viewport row 9 (last line of selection, excludes cursor head)
const $vp9 = fixture.node.querySelectorAll(".wb-selection")[9];
expect($vp9.style.left).toBe("0ch");
expect($vp9.style.width).toBe("4ch");


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
fixture.wb.Mode.spaces = 4;
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
expect(fixture.wb.Model.lines[0]).toBe(" a");
expect(fixture.wb.Model.lines[1]).toBe("x");
expect(fixture.wb.Model.lines[2]).toBe("b");

