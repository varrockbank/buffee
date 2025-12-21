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
expect(fixture.editor.Viewport.start).toBe(1);
// Move cursor to start of first viewport line (line1 = absolute row 1)
up 9 times
left with meta
EXPECT cursor at 1,0
// Alt+Left should scroll viewport up and move cursor to end of line0
left with alt
expect(fixture.editor.Viewport.start).toBe(0);
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
expect(fixture.editor.Viewport.start).toBe(0);
EXPECT cursor at 0,0
// Navigate to end of line9 (last visible row, with lines 10-14 below)
down 9 times
right with meta
EXPECT cursor at 9,5
// Alt+Right should scroll viewport down and move cursor to start of line10
right with alt
expect(fixture.editor.Viewport.start).toBe(1);
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
expect(fixture.editor.Viewport.start).toBe(0);
// Press up - should be no-op
up
expect(fixture.editor.Viewport.start).toBe(0);
EXPECT cursor at 0,0

