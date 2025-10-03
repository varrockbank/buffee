// Test definitions
const runner = new TestRunner();

// Basic Typing Tests
runner.describe('Basic Typing', () => {
  let fixture;
  runner.beforeEach(() => fixture = new EditorFixture());

  runner.it('should insert single character', () => {
    fixture.press('a').once();
    expect(fixture).toHaveLines('a');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 1 });
    expect(SecondEdge).toEqual({ row: 0, col: 1 });
  }, "Insert single character 'a'");

  runner.it('should insert multiple characters', () => {
    fixture.type('Hello');
    expect(fixture).toHaveLines('Hello');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Insert 'Hello'");

  runner.it('should insert word with spaces', () => {
    fixture.type('Hello World');
    expect(fixture).toHaveLines('Hello World');
  }, "Insert 'Hello World' with spaces");

  runner.it('should type sentence', () => {
    fixture.type('The quick brown fox');
    expect(fixture).toHaveLines('The quick brown fox');
  }, "Insert sentence 'The quick brown fox'");
});

// Backspace Tests
runner.describe('Backspace', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should delete single character', () => {
    fixture.type('Hello');
    fixture.press(Key.Backspace).once();
    expect(fixture).toHaveLines('Hell');
  }, "Delete single char from 'Hello' → 'Hell'");

  runner.it('should delete multiple characters', () => {
    fixture.type('Hello');
    fixture.press(Key.Backspace).times(3);
    expect(fixture).toHaveLines('He');
  }, "Delete 3 chars from 'Hello' → 'He'");

  runner.it('should delete all characters', () => {
    fixture.type('Hi');
    fixture.press(Key.Backspace).times(2);
    expect(fixture).toHaveLines('');
  }, "Delete all chars from 'Hi' → ''");

  runner.it('should delete from middle of line', () => {
    fixture.type('Hello');
    fixture.press(Key.ArrowLeft).times(2); // Position at 'l' (col 3)
    fixture.press(Key.Backspace).once(); // Delete 'l'
    expect(fixture).toHaveLines('Helo');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 2 });
    expect(SecondEdge).toEqual({ row: 0, col: 2 });
  }, "Delete from middle: 'Hello' → 'Helo'");

  runner.it('should delete multiple characters from middle', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).times(6); // Position at space (col 5)
    fixture.press(Key.Backspace).times(2); // Delete 'lo'
    expect(fixture).toHaveLines('Hel World');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 3 });
    expect(SecondEdge).toEqual({ row: 0, col: 3 });
  }, "Delete 2 chars from middle");

  runner.it('should handle Backspace beyond line start', () => {
    fixture.type('Hi');
    fixture.press(Key.Backspace).times(5); // Delete 2 chars + 3 extra
    expect(fixture).toHaveLines('');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 0 });
  }, "Backspace beyond line start");
});

// Enter/Newline Tests
runner.describe('Enter Key', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should create new line', () => {
    fixture.type('Hello');
    fixture.press(Key.Enter).once();
    expect(fixture).toHaveLines('Hello', '');
  }, "Create new line: 'Hello'[Enter] → 2 lines");

  runner.it('should create multiple lines', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.Enter).once();
    fixture.type('Line 3');
    expect(fixture).toHaveLines('Line 1', 'Line 2', 'Line 3');
  }, "Create multiple lines: 'Line 1'[Enter]'Line 2'[Enter]'Line 3' → 3 lines");

  runner.it('should split line with Enter', () => {
    fixture.type('Hello');
    fixture.press(Key.ArrowLeft).once();
    fixture.press(Key.ArrowLeft).once();
    fixture.press(Key.Enter).once();
    expect(fixture).toHaveLines('Hel', 'lo');
  }, "Split line: 'Hello'[ArrowLeft×2][Enter] → 'Hel' and 'lo'");

  runner.it('should add new line when pressing Enter at end of file', () => {
    fixture.type('First line');
    fixture.press(Key.Enter).once();
    fixture.type('Second line');
    fixture.press(Key.Enter).once(); // At end of file
    expect(fixture).toHaveLines('First line', 'Second line', '');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 2, col: 0 });
    expect(SecondEdge).toEqual({ row: 2, col: 0 });
  }, "Enter at end of file creates new line");

  runner.it('should create multiple empty lines from empty document', () => {
    fixture.press(Key.Enter).times(5);
    expect(fixture).toHaveLines('', '', '', '', '', '');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 5, col: 0 });
    expect(SecondEdge).toEqual({ row: 5, col: 0 });
  }, "Create multiple empty lines from empty document");
});

// Complex Sequences
runner.describe('Complex Sequences', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should type, delete, and retype', () => {
    fixture.type('Hello');
    fixture.press(Key.Backspace).times(2);
    fixture.type('y there');
    expect(fixture).toHaveLines('Hely there');
  }, "Type, delete, retype");

  runner.it('should create line, delete line break', () => {
    fixture.type('Hello');
    fixture.press(Key.Enter).once();
    fixture.type('World');
    fixture.press(Key.Backspace).times(6);
    expect(fixture).toHaveLines('Hello');
  }, "Create/delete line breaks");

  runner.it('should type multi-line then edit first line', () => {
    fixture.type('First');
    fixture.press(Key.Enter).once();
    fixture.type('Second');
    fixture.press(Key.ArrowUp).once();
    fixture.type(' Line');
    expect(fixture).toHaveLines('First Line', 'Second');
  }, "Multi-line editing");

  runner.it('should delete across line boundary', () => {
    fixture.type('Hello');
    fixture.press(Key.Enter).once();
    fixture.type('World');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Go to start of line
    fixture.press(Key.Backspace).once(); // Delete newline

    expect(fixture).toHaveLines('HelloWorld');
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Delete across boundaries");

  runner.it('should create paragraph and edit at end of middle line', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.Enter).once();
    fixture.type('Line 3');
    fixture.press(Key.ArrowUp).once();
    fixture.type(' edited');
    expect(fixture).toHaveLines('Line 1', 'Line 2 edited', 'Line 3');
  }, "Edit at end of middle line");

  runner.it('should create paragraph and edit at middle of middle line', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.Enter).once();
    fixture.type('Line 3');
    fixture.press(Key.ArrowUp).once();
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(3);
    fixture.type('X');
    expect(fixture).toHaveLines('Line 1', 'LinXe 2', 'Line 3');
  }, "Edit at middle of middle line");
});

// Selection Tests
runner.describe('Selection', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should create selection with Shift+ArrowRight', () => {
    fixture.type('Hello');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Move to start
    fixture.press(Key.ArrowRight).withShiftKey().once(); // Select 1 char
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 1 });
  }, "Select one character with Shift+ArrowRight");

  runner.it('should create selection with Shift+ArrowLeft', () => {
    fixture.type('Hello');
    fixture.press(Key.ArrowLeft).withShiftKey().once(); // Select 1 char backward
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 4 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Select one character with Shift+ArrowLeft");

  runner.it('should create multi-line selection with Shift+ArrowDown', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.ArrowUp).once();
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Start of Line 1
    fixture.press(Key.ArrowDown).withShiftKey().once(); // Select to Line 2
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 1, col: 0 });
  }, "Select multiple lines with Shift+ArrowDown");

  runner.it('should move cursor up without selection', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.ArrowUp).once();
    expect(fixture.wb.Selection.isSelection).toBe(false);
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 6 });
    expect(SecondEdge).toEqual({ row: 0, col: 6 });
  }, "Move cursor up without selection");

  runner.it('should create multi-line selection with Shift+ArrowUp', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.ArrowUp).withShiftKey().once();
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 6 });
    expect(SecondEdge).toEqual({ row: 1, col: 6 });
  }, "Select upward with Shift+ArrowUp");

  runner.it('should extend selection with multiple Shift+Arrow', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Start
    fixture.press(Key.ArrowRight).withShiftKey().times(5); // Select "Hello"
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Extend selection with multiple Shift+Arrow");
});

// Cursor movement between lines of varying length
runner.describe('Cursor movement - varying line lengths', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should preserve column when moving from long to short line', () => {
    fixture.type('Short');
    fixture.press(Key.Enter).once();
    fixture.type('Much longer line');
    fixture.press(Key.ArrowUp).once();
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Long to short: cursor at end of short line");

  runner.it('should restore column when moving back to long line', () => {
    fixture.type('Short');
    fixture.press(Key.Enter).once();
    fixture.type('Much longer line');
    // Assert cursor position after typing
    let [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 16 }); // One past last char
    expect(SecondEdge).toEqual({ row: 1, col: 16 });

    fixture.press(Key.ArrowUp).once();  // Move to "Short", col clamped to 5
    fixture.press(Key.ArrowDown).once(); // Move back to "Much longer line"
    [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 16 }); // Should restore to col 16
    expect(SecondEdge).toEqual({ row: 1, col: 16 });
  }, "Should restore original column when moving back");

  runner.it('should clamp column to line end on shorter line', () => {
    fixture.type('A');
    fixture.press(Key.Enter).once();
    fixture.type('Very long line here');
    fixture.press(Key.ArrowUp).once();
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 1 }); // Clamped to end of "A"
    expect(SecondEdge).toEqual({ row: 0, col: 1 });
  }, "Clamp to shorter line end");

  runner.it('should handle moving through multiple lines of varying length', () => {
    fixture.type('Line one');
    fixture.press(Key.Enter).once();
    fixture.type('Two');
    fixture.press(Key.Enter).once();
    fixture.type('Line three is longest');
    // Cursor at (2, 20)
    fixture.press(Key.ArrowUp).once(); // to "Two", clamped to (1, 3)
    fixture.press(Key.ArrowUp).once(); // to "Line one", should restore toward original col
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 8 }); // End of "Line one"
    expect(SecondEdge).toEqual({ row: 0, col: 8 });
  }, "Multiple lines with varying lengths");

  runner.it('should move from middle of long line to end of shorter line', () => {
    fixture.type('Short');
    fixture.press(Key.Enter).once();
    fixture.type('This is a much longer line');
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(10); // Position at middle of long line (col 10)
    fixture.press(Key.ArrowUp).once(); // Move to "Short", should clamp to end (col 5)
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 }); // Clamped to end of "Short"
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Move from middle of long line to end of short line");

  runner.it('should navigate between three lines: short, medium, long', () => {
    fixture.type('Short'); // Length 5
    fixture.press(Key.Enter).once();
    fixture.type('Medium!!'); // Length 8
    fixture.press(Key.Enter).once();
    fixture.type('Longest!!!'); // Length 10
    // Position at start of medium line (row 1)
    fixture.press(Key.ArrowUp).once(); // Move to medium line
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Start of medium line
    fixture.press(Key.ArrowRight).times(8); // End of medium line (col 8)

    // Move up to short line - should clamp to col 5
    fixture.press(Key.ArrowUp).once();
    let [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 }); // Clamped to end of "Short"
    expect(SecondEdge).toEqual({ row: 0, col: 5 });

    // Move down twice to longest line - should restore to col 8
    fixture.press(Key.ArrowDown).once(); // Back to medium
    fixture.press(Key.ArrowDown).once(); // To longest
    [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 2, col: 8 }); // Middle of "Longest!!!" (col 8)
    expect(SecondEdge).toEqual({ row: 2, col: 8 });
  }, "Navigate from medium line to short and long lines");

  runner.it('should navigate between three lines: short, medium, long (natural typing)', () => {
    fixture.type('Short'); // Length 5
    fixture.press(Key.Enter).once();
    fixture.type('Medium!!'); // Length 8
    fixture.press(Key.Enter).once();
    fixture.type('Longest!!!'); // Length 10
    // Cursor at end of longest line (row 2, col 10)
    fixture.press(Key.ArrowUp).once(); // Move to medium line (row 1, col 8)
    fixture.press(Key.ArrowRight).withMetaKey().once(); // Reset maxCol from 10 to 8

    // Move up to short line - should clamp to col 5
    fixture.press(Key.ArrowUp).once();
    let [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 }); // Clamped to end of "Short"
    expect(SecondEdge).toEqual({ row: 0, col: 5 });

    // Move down twice to longest line - should restore to col 8
    fixture.press(Key.ArrowDown).once(); // Back to medium
    fixture.press(Key.ArrowDown).once(); // To longest
    [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 2, col: 8 }); // Middle of "Longest!!!" (col 8)
    expect(SecondEdge).toEqual({ row: 2, col: 8 });
  }, "Navigate from medium line to short and long lines (natural typing)");
});

// Meta+Arrow navigation (Cmd/Ctrl+Left/Right)
runner.describe('Meta+Arrow navigation', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should move to end of line with Meta+Right', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Move to start
    let [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 0 });

    fixture.press(Key.ArrowRight).withMetaKey().once(); // Move to end
    [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 11 });
    expect(SecondEdge).toEqual({ row: 0, col: 11 });
  }, "Meta+Right moves to end of line");

  runner.it('should move to start of line from middle', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).times(3);
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Jump to start
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 0 });
  }, "Meta+Left from middle of line");

  runner.it('should move to end of line from middle', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).times(3);
    fixture.press(Key.ArrowRight).withMetaKey().once(); // Jump to end
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 11 });
    expect(SecondEdge).toEqual({ row: 0, col: 11 });
  }, "Meta+Right from middle of line");

  runner.it('should work on multi-line document', () => {
    fixture.type('First line');
    fixture.press(Key.Enter).once();
    fixture.type('Second line here');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Start of line 2
    let [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 0 });
    expect(SecondEdge).toEqual({ row: 1, col: 0 });

    fixture.press(Key.ArrowRight).withMetaKey().once(); // End of line 2
    [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 16 });
    expect(SecondEdge).toEqual({ row: 1, col: 16 });
  }, "Meta+Left/Right on second line");

  runner.it('should work when navigating between lines', () => {
    fixture.type('Short');
    fixture.press(Key.Enter).once();
    fixture.type('Much longer line');
    fixture.press(Key.ArrowUp).once(); // Move to line 1
    fixture.press(Key.ArrowRight).withMetaKey().once(); // End of line 1
    const [firstEdge, SecondEdge] = fixture.wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Meta+Right after moving between lines");
});

// Shift+Meta+Arrow selection
runner.describe('Shift+Meta+Arrow selection', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should select to end of line with Shift+Meta+Right', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Move to start
    fixture.press(Key.ArrowRight).withShiftKey().withMetaKey().once(); // Select to end
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 11 });
  }, "Shift+Meta+Right selects to end of line");

  runner.it('should select to start of line with Shift+Meta+Left', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).withShiftKey().withMetaKey().once(); // Select to start
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 11 });
  }, "Shift+Meta+Left selects to start of line");

  runner.it('should select from middle to end', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).times(3); // Back 3 (at col 8)
    fixture.press(Key.ArrowRight).withShiftKey().withMetaKey().once(); // Select to end
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 8 });
    expect(end).toEqual({ row: 0, col: 11 });
  }, "Shift+Meta+Right from middle selects to end");

  runner.it('should select from middle to start', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).times(3); // Back 3 (at col 8)
    fixture.press(Key.ArrowLeft).withShiftKey().withMetaKey().once(); // Select to start
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 8 });
  }, "Shift+Meta+Left from middle selects to start");

  runner.it('should select on second line of multi-line document', () => {
    fixture.type('First line');
    fixture.press(Key.Enter).once();
    fixture.type('Second line here');
    fixture.press(Key.ArrowLeft).withShiftKey().withMetaKey().once(); // Select to start of line 2
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 1, col: 0 });
    expect(end).toEqual({ row: 1, col: 16 });
  }, "Shift+Meta+Left on second line");

  runner.it('should extend existing selection with Shift+Meta+Right', () => {
    fixture.type('Hello World Here');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // To start
    fixture.press(Key.ArrowRight).withShiftKey().times(2); // Select 'He'
    fixture.press(Key.ArrowRight).withShiftKey().withMetaKey().once(); // Extend to end
    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 16 });
  }, "Extend selection to end with Shift+Meta+Right");
});

// Multi-line selections
runner.describe('Multi-line selections', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should select 3 rows with start in middle, end in middle', () => {
    fixture.type('First line here');
    fixture.press(Key.Enter).once();
    fixture.type('Second line here');
    fixture.press(Key.Enter).once();
    fixture.type('Third line here');
    fixture.press(Key.Enter).once();
    fixture.type('Fourth line here');

    // Move to middle of first line (col 6, after "First ")
    fixture.press(Key.ArrowUp).times(3);
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(6);

    // Select down to third line, middle (col 6)
    fixture.press(Key.ArrowDown).withShiftKey().times(2);

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 2, col: 6 });
  }, "Select 3 rows: middle to middle");

  runner.it('should select 3 rows with start at beginning, end at end', () => {
    fixture.type('First line here');
    fixture.press(Key.Enter).once();
    fixture.type('Second line here');
    fixture.press(Key.Enter).once();
    fixture.type('Third line here');

    // Move to beginning of first line
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowLeft).withMetaKey().once();

    // Select to end of third line
    fixture.press(Key.ArrowDown).withShiftKey().times(2);
    fixture.press(Key.ArrowRight).withShiftKey().withMetaKey().once();

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 2, col: 15 });
  }, "Select 3 rows: beginning to end");

  runner.it('should select 3 rows with start at end of line', () => {
    fixture.type('First');
    fixture.press(Key.Enter).once();
    fixture.type('Second line here');
    fixture.press(Key.Enter).once();
    fixture.type('Third line here');

    // Move to end of first line
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowRight).withMetaKey().once();

    // Select down to middle of third line
    fixture.press(Key.ArrowDown).withShiftKey().times(2);

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 5 });
    expect(end).toEqual({ row: 2, col: 5 });
  }, "Select 3 rows: end of line to middle");

  runner.it('should select 3 rows with start in middle, end at beginning', () => {
    fixture.type('First line here');
    fixture.press(Key.Enter).once();
    fixture.type('Second line here');
    fixture.press(Key.Enter).once();
    fixture.type('Third line here');

    // Move to middle of first line (col 6)
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(6);

    // Select to beginning of third line
    fixture.press(Key.ArrowDown).withShiftKey().times(2);
    fixture.press(Key.ArrowLeft).withShiftKey().withMetaKey().once();

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 2, col: 0 });
  }, "Select 3 rows: middle to beginning");

  runner.it('should select at last character of line then extend down', () => {
    fixture.type('First');
    fixture.press(Key.Enter).once();
    fixture.type('Second');
    fixture.press(Key.Enter).once();
    fixture.type('Third');

    // Move to last character 't' of first line (col 4)
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowLeft).once();

    // Select character and extend right (wraps to next line)
    fixture.press(Key.ArrowRight).withShiftKey().once();
    fixture.press(Key.ArrowDown).withShiftKey().once();

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 4 });
    expect(end).toEqual({ row: 2, col: 0 });
  }, "Select from last character and extend down");

  runner.it('should extend selection down 4 rows', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.Enter).once();
    fixture.type('Line 3');
    fixture.press(Key.Enter).once();
    fixture.type('Line 4');
    fixture.press(Key.Enter).once();
    fixture.type('Line 5');
    fixture.press(Key.Enter).once();
    fixture.type('Line 6');

    // Move to beginning of first line
    fixture.press(Key.ArrowUp).times(5);
    fixture.press(Key.ArrowLeft).withMetaKey().once();

    // Select down 4 rows
    fixture.press(Key.ArrowDown).withShiftKey().times(4);

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 4, col: 0 });
  }, "Select down 4 rows from beginning");

  runner.it('should extend selection right 3 columns', () => {
    fixture.type('Hello World');
    fixture.press(Key.Enter).once();
    fixture.type('Second line');

    // Move to beginning of first line
    fixture.press(Key.ArrowUp).once();
    fixture.press(Key.ArrowLeft).withMetaKey().once();

    // Select right 3 columns
    fixture.press(Key.ArrowRight).withShiftKey().times(3);

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 3 });
  }, "Select right 3 columns");

  runner.it('should extend selection down 4 rows then right 3 columns', () => {
    fixture.type('Line 1');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2');
    fixture.press(Key.Enter).once();
    fixture.type('Line 3');
    fixture.press(Key.Enter).once();
    fixture.type('Line 4');
    fixture.press(Key.Enter).once();
    fixture.type('Line 5 with more text');

    // Move to beginning of first line
    fixture.press(Key.ArrowUp).times(4);
    fixture.press(Key.ArrowLeft).withMetaKey().once();

    // Select down 4 rows
    fixture.press(Key.ArrowDown).withShiftKey().times(4);

    // Then right 3 columns
    fixture.press(Key.ArrowRight).withShiftKey().times(3);

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 4, col: 3 });
  }, "Select down 4 rows then right 3 columns");

  runner.it('should extend selection from middle down 4 rows then right 3 columns', () => {
    fixture.type('Line 1 text');
    fixture.press(Key.Enter).once();
    fixture.type('Line 2 text');
    fixture.press(Key.Enter).once();
    fixture.type('Line 3 text');
    fixture.press(Key.Enter).once();
    fixture.type('Line 4 text');
    fixture.press(Key.Enter).once();
    fixture.type('Line 5 with more text');

    // Move to col 5 of first line (after "Line ")
    fixture.press(Key.ArrowUp).times(4);
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(5);

    // Select down 4 rows
    fixture.press(Key.ArrowDown).withShiftKey().times(4);

    // Then right 3 columns
    fixture.press(Key.ArrowRight).withShiftKey().times(3);

    expect(fixture.wb.Selection.isSelection).toBe(true);
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 5 });
    expect(end).toEqual({ row: 4, col: 8 });
  }, "Select from middle down 4 rows then right 3 columns");
});

// Deleting selections with Backspace
runner.describe('Deleting selections', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should delete single line selection with Backspace', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).withMetaKey().once(); // Start at col 0
    fixture.press(Key.ArrowRight).withShiftKey().times(5); // Select to col 5

    fixture.press(Key.Backspace).once();

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('World');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 0 });
  }, "Delete 'Hello ' from 'Hello World'");

  runner.it('should delete entire line with Backspace', () => {
    fixture.type('Delete me');
    fixture.press(Key.ArrowLeft).withShiftKey().withMetaKey().once(); // Select all

    fixture.press(Key.Backspace).once();

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 0 });
  }, "Delete entire line");

  runner.it('should delete multi-line selection with Backspace', () => {
    fixture.type('First line');
    fixture.press(Key.Enter).once();
    fixture.type('Second line');
    fixture.press(Key.Enter).once();
    fixture.type('Third line');

    // Select from beginning of first to col 0 of third (includes 'T')
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowDown).withShiftKey().times(2);

    fixture.press(Key.Backspace).once();

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('hird line');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 0 });
  }, "Delete two full lines plus first character");

  runner.it('should delete partial multi-line selection with Backspace', () => {
    fixture.type('First line here');
    fixture.press(Key.Enter).once();
    fixture.type('Second line here');
    fixture.press(Key.Enter).once();
    fixture.type('Third line here');

    // Select from middle of first (col 6) to middle of third (col 6)
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(6);
    fixture.press(Key.ArrowDown).withShiftKey().times(2);

    fixture.press(Key.Backspace).once();

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('First ine here');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Delete partial multi-line selection");

  runner.it('should delete from middle to end across lines with Backspace', () => {
    fixture.type('First line');
    fixture.press(Key.Enter).once();
    fixture.type('Second line');

    // Select from middle of first line to end of second
    fixture.press(Key.ArrowUp).once();
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(6);
    fixture.press(Key.ArrowDown).withShiftKey().once();
    fixture.press(Key.ArrowRight).withShiftKey().withMetaKey().once();

    fixture.press(Key.Backspace).once();

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('First ');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Delete from middle to end across lines");

  runner.it('should delete backward selection with Backspace', () => {
    fixture.type('Hello World');
    // Select backward from col 11 to col 6
    fixture.press(Key.ArrowLeft).withShiftKey().times(5);

    fixture.press(Key.Backspace).once();

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('Hello ');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Delete backward selection");
});

// Replacing selections by typing
runner.describe('Replacing selections', () => {
  let fixture;

  runner.beforeEach(() => {
    fixture = new EditorFixture();
  });

  runner.it('should replace single line selection with typed character', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    // Select "Hello " (6 characters, positions 0-5)
    fixture.press(Key.ArrowRight).withShiftKey().times(5);

    fixture.type('X');

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('XWorld');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 1 });
    expect(end).toEqual({ row: 0, col: 1 });
  }, "Replace 'Hello ' with 'X'");

  runner.it('should replace selection with multiple characters', () => {
    fixture.type('Hello World');
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    // Select "Hello " (6 characters, positions 0-5)
    fixture.press(Key.ArrowRight).withShiftKey().times(5);

    fixture.type('Goodbye');

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('GoodbyeWorld');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 7 });
    expect(end).toEqual({ row: 0, col: 7 });
  }, "Replace 'Hello ' with 'Goodbye'");

  runner.it('should replace entire line with typed text', () => {
    fixture.type('Old text');
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).withShiftKey().withMetaKey().once();

    fixture.type('New');

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('New');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 3 });
    expect(end).toEqual({ row: 0, col: 3 });
  }, "Replace entire line");

  runner.it('should replace multi-line selection with single character', () => {
    fixture.type('First line');
    fixture.press(Key.Enter).once();
    fixture.type('Second line');
    fixture.press(Key.Enter).once();
    fixture.type('Third line');

    // Select from start of first to start of third
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowDown).withShiftKey().times(2);

    fixture.type('X');

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('Xhird line');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 1 });
    expect(end).toEqual({ row: 0, col: 1 });
  }, "Replace multi-line selection with 'X'");

  runner.it('should replace multi-line selection with multiple characters', () => {
    fixture.type('First line');
    fixture.press(Key.Enter).once();
    fixture.type('Second line');
    fixture.press(Key.Enter).once();
    fixture.type('Third line');

    // Select from middle of first (col 6) to middle of third (col 6)
    fixture.press(Key.ArrowUp).times(2);
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(6);
    fixture.press(Key.ArrowDown).withShiftKey().times(2);

    fixture.type('REPLACED');

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('First REPLACEDine');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 14 });
    expect(end).toEqual({ row: 0, col: 14 });
  }, "Replace partial multi-line with text");

  runner.it('should replace backward selection with typed text', () => {
    fixture.type('Hello World');
    // Select "World" backward
    fixture.press(Key.ArrowLeft).withShiftKey().times(5);

    fixture.type('Everyone');

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('Hello Everyone');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 14 });
    expect(end).toEqual({ row: 0, col: 14 });
  }, "Replace backward selection");

  runner.it('should replace selection with space', () => {
    fixture.type('HelloWorld');
    fixture.press(Key.ArrowLeft).withMetaKey().once();
    fixture.press(Key.ArrowRight).times(5);
    fixture.press(Key.ArrowRight).withShiftKey().times(5);

    fixture.press(' ').once();

    expect(fixture.wb.Selection.isSelection).toBe(false);
    expect(fixture).toHaveLines('Hello ');
    const [start, end] = fixture.wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Replace 'World' with space");
});
