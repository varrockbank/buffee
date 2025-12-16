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
down with shift
EXPECT selection at 0,4-2,0

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
### Delete 'Hello ' from 'Hello World'
TYPE "Hello World"
left with meta
right 5 times with shift
backspace
expect(fixture).toHaveLines('World');
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
expect(fixture).toHaveLines('hird line');
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
expect(fixture).toHaveLines('First ine here');
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
### Replace 'Hello ' with 'X'
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "X"
expect(fixture).toHaveLines('XWorld');
EXPECT cursor at 0,1

## should replace partial text with word
### Replace 'Hello ' with 'Goodbye'
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "Goodbye"
expect(fixture).toHaveLines('GoodbyeWorld');
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
expect(fixture).toHaveLines('Xhird line');
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
expect(fixture).toHaveLines('First REPLACEDine');
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
down with shift
EXPECT selection at 0,0-2,0


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


# Gutter resizing

## should grow gutter when scrolling to double-digit line numbers
### Gutter grows from 1 to 2 digits when viewport.end reaches 10
// Create fixture with viewport size 9
fixture = FixtureFactory.forTest(9);
// Add 11 lines (indices 0-10)
fixture.wb.Model.text = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11";
// Initial: lines 0-8 visible, end=8 (1 digit), gutter = 2ch
const $gutter = fixture.node.querySelector(".wb-gutter");
expect($gutter.style.width).toBe("2ch");
// Scroll down by 2: lines 2-10 visible, end=10 (2 digits), gutter = 3ch
fixture.wb.Viewport.scroll(2);
expect($gutter.style.width).toBe("3ch");

## should shrink gutter when scrolling back to single-digit line numbers
### Gutter shrinks from 2 to 1 digit when viewport.end drops below 10
// Create fixture with viewport size 9
fixture = FixtureFactory.forTest(9);
// Add 11 lines (indices 0-10)
fixture.wb.Model.text = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11";
// Scroll to double-digit first
fixture.wb.Viewport.scroll(2);
const $gutter = fixture.node.querySelector(".wb-gutter");
expect($gutter.style.width).toBe("3ch");
// Scroll back up: lines 0-8 visible, end=8 (1 digit), gutter = 2ch
fixture.wb.Viewport.scroll(-2);
expect($gutter.style.width).toBe("2ch");


# Indentation property

## should have default indentation of 4
### Default indentation is 4 spaces
expect(fixture.wb.indentation).toBe(4);

## should update indentation at runtime
### Setting indentation updates value and display
fixture.wb.indentation = 2;
expect(fixture.wb.indentation).toBe(2);
const $indentation = fixture.node.querySelector(".wb-indentation");
expect($indentation.innerHTML).toBe("Spaces: 2");

## should allow changing indentation multiple times
### Indentation can be changed multiple times
fixture.wb.indentation = 8;
expect(fixture.wb.indentation).toBe(8);
fixture.wb.indentation = 4;
expect(fixture.wb.indentation).toBe(4);
const $indentation = fixture.node.querySelector(".wb-indentation");
expect($indentation.innerHTML).toBe("Spaces: 4");

## should initialize with custom indentation from config
### Config indentation=7 sets initial value
const customNode = document.createElement("div");
customNode.className = "wb no-select";
customNode.innerHTML = fixture.node.innerHTML;
document.body.appendChild(customNode);
const customEditor = new Vbuf(customNode, { indentation: 7 });
expect(customEditor.indentation).toBe(7);
expect(customNode.querySelector(".wb-indentation").innerHTML).toBe("Spaces: 7");
customNode.remove();


# NewLine with selection

## should replace selection with newline
### NewLine with selection deletes selection and inserts newline (vim-style: cursor on char, shift+left selects current + previous)
TYPE "ABC"
left 2 times
left with shift
enter
expect(fixture).toHaveLines("", "C");
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
expect(fixture).toHaveLines("World");
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
expect(fixture).toHaveLines("XWorld");
EXPECT cursor at 0,1
fixture.wb.History.undo();
expect(fixture).toHaveLines("Hello World");
EXPECT cursor at 0,0
