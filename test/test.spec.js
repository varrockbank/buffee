// Test utilities
function createTestEditor() {
  const container = document.querySelector('.editor-container');

  const node = document.createElement('div');
  node.className = 'wb no-select';
  node.innerHTML = `
    <textarea class="wb-clipboard-bridge" aria-hidden="true"></textarea>
    <div style="display: flex">
      <div class="wb-gutter"></div>
      <div class="wb-lines" style="flex: 1; overflow: hidden;"></div>
    </div>
    <div class="wb-status" style="display: flex; justify-content: space-between;">
      <div class="wb-status-left" style="display: flex;">
        <span class="wb-linecount"></span>
      </div>
      <div class="wb-status-right" style="display: flex;">
        <span class="wb-coordinate"></span>
        <span>|</span>
        <span class="wb-indentation"></span>
      </div>
    </div>
  `;

  container.innerHTML = '';
  container.appendChild(node);

  return { wb: new WarrenBuf(node), node };
}

function dispatchKey(node, key, modifiers = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    bubbles: true,
    cancelable: true,
    metaKey: modifiers.meta || false,
    ctrlKey: modifiers.ctrl || false,
    shiftKey: modifiers.shift || false,
    altKey: modifiers.alt || false
  });
  node.dispatchEvent(event);
}

function type(node, text) {
  for (const char of text) {
    dispatchKey(node, char);
  }
}

function repeatKey(node, key, count, modifiers = {}) {
  for (let i = 0; i < count; i++) {
    dispatchKey(node, key, modifiers);
  }
}

// Test definitions
const runner = new TestRunner();

// Basic Typing Tests
runner.describe('Basic Typing', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should insert single character', () => {
    dispatchKey(node, 'a');
    expect(wb.Model.lines[0]).toBe('a');
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 1 });
    expect(SecondEdge).toEqual({ row: 0, col: 1 });
  }, "Insert single character 'a'");

  runner.it('should insert multiple characters', () => {
    type(node, 'Hello');
    expect(wb.Model.lines[0]).toBe('Hello');
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Insert 'Hello'");

  runner.it('should insert word with spaces', () => {
    type(node, 'Hello World');
    expect(wb.Model.lines[0]).toBe('Hello World');
  }, "Insert 'Hello World' with spaces");

  runner.it('should type sentence', () => {
    type(node, 'The quick brown fox');
    expect(wb.Model.lines[0]).toBe('The quick brown fox');
  }, "Insert sentence 'The quick brown fox'");
});

// Backspace Tests
runner.describe('Backspace', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should delete single character', () => {
    type(node, 'Hello');
    dispatchKey(node, 'Backspace');
    expect(wb.Model.lines[0]).toBe('Hell');
  }, "Delete single char from 'Hello' → 'Hell'");

  runner.it('should delete multiple characters', () => {
    type(node, 'Hello');
    repeatKey(node, 'Backspace', 3);
    expect(wb.Model.lines[0]).toBe('He');
  }, "Delete 3 chars from 'Hello' → 'He'");

  runner.it('should delete all characters', () => {
    type(node, 'Hi');
    repeatKey(node, 'Backspace', 2);
    expect(wb.Model.lines[0]).toBe('');
  }, "Delete all chars from 'Hi' → ''");
});

// Enter/Newline Tests
runner.describe('Enter Key', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should create new line', () => {
    type(node, 'Hello');
    dispatchKey(node, 'Enter');
    expect(wb.Model.lines).toHaveLength(2);
    expect(wb.Model.lines[0]).toBe('Hello');
    expect(wb.Model.lines[1]).toBe('');
  }, "Create new line: 'Hello'[Enter] → 2 lines");

  runner.it('should create multiple lines', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'Enter');
    type(node, 'Line 3');
    expect(wb.Model.lines).toHaveLength(3);
    expect(wb.Model.lines[0]).toBe('Line 1');
    expect(wb.Model.lines[1]).toBe('Line 2');
    expect(wb.Model.lines[2]).toBe('Line 3');
  }, "Create multiple lines: 'Line 1'[Enter]'Line 2'[Enter]'Line 3' → 3 lines");

  runner.it('should split line with Enter', () => {
    type(node, 'Hello');
    dispatchKey(node, 'ArrowLeft');
    dispatchKey(node, 'ArrowLeft');
    dispatchKey(node, 'Enter');
    expect(wb.Model.lines).toHaveLength(2);
    expect(wb.Model.lines[0]).toBe('Hel');
    expect(wb.Model.lines[1]).toBe('lo');
  }, "Split line: 'Hello'[ArrowLeft×2][Enter] → 'Hel' and 'lo'");
});

// Complex Sequences
runner.describe('Complex Sequences', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should type, delete, and retype', () => {
    type(node, 'Hello');
    repeatKey(node, 'Backspace', 2);
    type(node, 'y there');
    expect(wb.Model.lines[0]).toBe('Hely there');
  }, "Type, delete, retype");

  runner.it('should create line, delete line break', () => {
    type(node, 'Hello');
    dispatchKey(node, 'Enter');
    type(node, 'World');
    repeatKey(node, 'Backspace', 6);
    expect(wb.Model.lines).toHaveLength(1);
    expect(wb.Model.lines[0]).toBe('Hello');
  }, "Create/delete line breaks");

  runner.it('should type multi-line then edit first line', () => {
    type(node, 'First');
    dispatchKey(node, 'Enter');
    type(node, 'Second');
    dispatchKey(node, 'ArrowUp');
    dispatchKey(node, 'ArrowRight', { meta: true });
    type(node, ' Line');
    expect(wb.Model.lines[0]).toBe('First Line');
    expect(wb.Model.lines[1]).toBe('Second');
  }, "Multi-line editing");

  runner.it('should delete across line boundary', () => {
    type(node, 'Hello');
    dispatchKey(node, 'Enter');
    type(node, 'World');
    // Cursor is now at row 1, col 5 (after 'World')
    // Move to row 1, col 0 (before 'W')
    dispatchKey(node, 'ArrowLeft', { meta: true });
    // Delete the newline character (backspace from row 1, col 0 merges lines)
    dispatchKey(node, 'Backspace');
    expect(wb.Model.lines).toHaveLength(1);
    expect(wb.Model.lines[0]).toBe('HelloWorld');
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Delete across boundaries");

  runner.it('should create paragraph and edit middle', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'Enter');
    type(node, 'Line 3');
    dispatchKey(node, 'ArrowUp');
    dispatchKey(node, 'ArrowRight', { meta: true });
    type(node, ' edited');
    expect(wb.Model.lines).toHaveLength(3);
    expect(wb.Model.lines[0]).toBe('Line 1');
    expect(wb.Model.lines[1]).toBe('Line 2 edited');
    expect(wb.Model.lines[2]).toBe('Line 3');
  }, "Edit middle of paragraph");
});

// Selection Tests
runner.describe('Selection', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should create selection with Shift+ArrowRight', () => {
    type(node, 'Hello');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Move to start
    dispatchKey(node, 'ArrowRight', { shift: true }); // Select 1 char
    expect(wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 1 });
  }, "Select one character with Shift+ArrowRight");

  runner.it('should create selection with Shift+ArrowLeft', () => {
    type(node, 'Hello');
    dispatchKey(node, 'ArrowLeft', { shift: true }); // Select 1 char backward
    expect(wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 4 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Select one character with Shift+ArrowLeft");

  runner.it('should create multi-line selection with Shift+ArrowDown', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'ArrowUp');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Start of Line 1
    dispatchKey(node, 'ArrowDown', { shift: true }); // Select to Line 2
    expect(wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 1, col: 0 });
  }, "Select multiple lines with Shift+ArrowDown");

  runner.it('should move cursor up without selection', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'ArrowUp');
    expect(wb.Selection.isSelection).toBe(false);
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 6 });
    expect(SecondEdge).toEqual({ row: 0, col: 6 });
  }, "Move cursor up without selection");

  runner.it('should create multi-line selection with Shift+ArrowUp', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'ArrowUp', { shift: true });
    expect(wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 6 });
    expect(SecondEdge).toEqual({ row: 1, col: 6 });
  }, "Select upward with Shift+ArrowUp");

  runner.it('should extend selection with multiple Shift+Arrow', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Start
    repeatKey(node, 'ArrowRight', 5, { shift: true }); // Select "Hello"
    expect(wb.Selection.isSelection).toBe(true);
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Extend selection with multiple Shift+Arrow");
});

// Cursor movement between lines of varying length
runner.describe('Cursor movement - varying line lengths', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should preserve column when moving from long to short line', () => {
    type(node, 'Short');
    dispatchKey(node, 'Enter');
    type(node, 'Much longer line');
    dispatchKey(node, 'ArrowUp');
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Long to short: cursor at end of short line");

  runner.it('should restore column when moving back to long line', () => {
    type(node, 'Short');
    dispatchKey(node, 'Enter');
    type(node, 'Much longer line');
    // Assert cursor position after typing
    let [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 16 }); // One past last char
    expect(SecondEdge).toEqual({ row: 1, col: 16 });

    dispatchKey(node, 'ArrowUp');  // Move to "Short", col clamped to 5
    dispatchKey(node, 'ArrowDown'); // Move back to "Much longer line"
    [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 16 }); // Should restore to col 16
    expect(SecondEdge).toEqual({ row: 1, col: 16 });
  }, "Should restore original column when moving back");

  runner.it('should clamp column to line end on shorter line', () => {
    type(node, 'A');
    dispatchKey(node, 'Enter');
    type(node, 'Very long line here');
    dispatchKey(node, 'ArrowUp');
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 1 }); // Clamped to end of "A"
    expect(SecondEdge).toEqual({ row: 0, col: 1 });
  }, "Clamp to shorter line end");

  runner.it('should handle moving through multiple lines of varying length', () => {
    type(node, 'Line one');
    dispatchKey(node, 'Enter');
    type(node, 'Two');
    dispatchKey(node, 'Enter');
    type(node, 'Line three is longest');
    // Cursor at (2, 20)
    dispatchKey(node, 'ArrowUp'); // to "Two", clamped to (1, 3)
    dispatchKey(node, 'ArrowUp'); // to "Line one", should restore toward original col
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 8 }); // End of "Line one"
    expect(SecondEdge).toEqual({ row: 0, col: 8 });
  }, "Multiple lines with varying lengths");
});

// Meta+Arrow navigation (Cmd/Ctrl+Left/Right)
runner.describe('Meta+Arrow navigation', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should move to end of line with Meta+Right', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Move to start
    dispatchKey(node, 'ArrowRight', { meta: true }); // Move to end
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 11 });
    expect(SecondEdge).toEqual({ row: 0, col: 11 });
  }, "Meta+Right moves to end of line");

  runner.it('should move to start of line with Meta+Left', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Move to start
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 0 });
  }, "Meta+Left moves to start of line");

  runner.it('should move to start of line from middle', () => {
    type(node, 'Hello World');
    repeatKey(node, 'ArrowLeft', 3);
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Jump to start
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 0 });
    expect(SecondEdge).toEqual({ row: 0, col: 0 });
  }, "Meta+Left from middle of line");

  runner.it('should work on multi-line document', () => {
    type(node, 'First line');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Start of line 2
    let [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 0 });
    expect(SecondEdge).toEqual({ row: 1, col: 0 });

    dispatchKey(node, 'ArrowRight', { meta: true }); // End of line 2
    [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 1, col: 16 });
    expect(SecondEdge).toEqual({ row: 1, col: 16 });
  }, "Meta+Left/Right on second line");

  runner.it('should work when navigating between lines', () => {
    type(node, 'Short');
    dispatchKey(node, 'Enter');
    type(node, 'Much longer line');
    dispatchKey(node, 'ArrowUp'); // Move to line 1
    dispatchKey(node, 'ArrowRight', { meta: true }); // End of line 1
    const [firstEdge, SecondEdge] = wb.Selection.ordered;
    expect(firstEdge).toEqual({ row: 0, col: 5 });
    expect(SecondEdge).toEqual({ row: 0, col: 5 });
  }, "Meta+Right after moving between lines");
});

// Shift+Meta+Arrow selection
runner.describe('Shift+Meta+Arrow selection', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should select to end of line with Shift+Meta+Right', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Move to start
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true }); // Select to end
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 11 });
  }, "Shift+Meta+Right selects to end of line");

  runner.it('should select to start of line with Shift+Meta+Left', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { shift: true, meta: true }); // Select to start
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 11 });
  }, "Shift+Meta+Left selects to start of line");

  runner.it('should select from middle to end', () => {
    type(node, 'Hello World');
    repeatKey(node, 'ArrowLeft', 3); // Back 3 (at col 8)
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true }); // Select to end
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 8 });
    expect(end).toEqual({ row: 0, col: 11 });
  }, "Shift+Meta+Right from middle selects to end");

  runner.it('should select from middle to start', () => {
    type(node, 'Hello World');
    repeatKey(node, 'ArrowLeft', 3); // Back 3 (at col 8)
    dispatchKey(node, 'ArrowLeft', { shift: true, meta: true }); // Select to start
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 8 });
  }, "Shift+Meta+Left from middle selects to start");

  runner.it('should select on second line of multi-line document', () => {
    type(node, 'First line');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'ArrowLeft', { shift: true, meta: true }); // Select to start of line 2
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 1, col: 0 });
    expect(end).toEqual({ row: 1, col: 16 });
  }, "Shift+Meta+Left on second line");

  runner.it('should extend existing selection with Shift+Meta+Right', () => {
    type(node, 'Hello World Here');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // To start
    repeatKey(node, 'ArrowRight', 2, { shift: true }); // Select 'He'
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true }); // Extend to end
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 16 });
  }, "Extend selection to end with Shift+Meta+Right");
});

// Multi-line selections
runner.describe('Multi-line selections', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should select 3 rows with start in middle, end in middle', () => {
    type(node, 'First line here');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'Enter');
    type(node, 'Third line here');
    dispatchKey(node, 'Enter');
    type(node, 'Fourth line here');

    // Move to middle of first line (col 6, after "First ")
    repeatKey(node, 'ArrowUp', 3);
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowRight', 6);

    // Select down to third line, middle (col 6)
    dispatchKey(node, 'ArrowDown', { shift: true });
    dispatchKey(node, 'ArrowDown', { shift: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 2, col: 6 });
  }, "Select 3 rows: middle to middle");

  runner.it('should select 3 rows with start at beginning, end at end', () => {
    type(node, 'First line here');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'Enter');
    type(node, 'Third line here');

    // Move to beginning of first line
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowLeft', { meta: true });

    // Select to end of third line
    repeatKey(node, 'ArrowDown', 2, { shift: true });
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 2, col: 15 });
  }, "Select 3 rows: beginning to end");

  runner.it('should select 3 rows with start at end of line', () => {
    type(node, 'First');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'Enter');
    type(node, 'Third line here');

    // Move to end of first line
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowRight', { meta: true });

    // Select down to middle of third line
    repeatKey(node, 'ArrowDown', 2, { shift: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 5 });
    expect(end).toEqual({ row: 2, col: 5 });
  }, "Select 3 rows: end of line to middle");

  runner.it('should select 3 rows with start in middle, end at beginning', () => {
    type(node, 'First line here');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'Enter');
    type(node, 'Third line here');

    // Move to middle of first line (col 6)
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowRight', 6);

    // Select to beginning of third line
    repeatKey(node, 'ArrowDown', 2, { shift: true });
    dispatchKey(node, 'ArrowLeft', { shift: true, meta: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 2, col: 0 });
  }, "Select 3 rows: middle to beginning");

  runner.it('should select at last character of line then extend down', () => {
    type(node, 'First');
    dispatchKey(node, 'Enter');
    type(node, 'Second');
    dispatchKey(node, 'Enter');
    type(node, 'Third');

    // Move to last character 't' of first line (col 4)
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowRight', { meta: true });
    dispatchKey(node, 'ArrowLeft');

    // Select character and extend right (wraps to next line)
    dispatchKey(node, 'ArrowRight', { shift: true });
    dispatchKey(node, 'ArrowDown', { shift: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 4 });
    expect(end).toEqual({ row: 2, col: 0 });
  }, "Select from last character and extend down");

  runner.it('should extend selection down 4 rows', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'Enter');
    type(node, 'Line 3');
    dispatchKey(node, 'Enter');
    type(node, 'Line 4');
    dispatchKey(node, 'Enter');
    type(node, 'Line 5');
    dispatchKey(node, 'Enter');
    type(node, 'Line 6');

    // Move to beginning of first line
    repeatKey(node, 'ArrowUp', 5);
    dispatchKey(node, 'ArrowLeft', { meta: true });

    // Select down 4 rows
    repeatKey(node, 'ArrowDown', 4, { shift: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 4, col: 0 });
  }, "Select down 4 rows from beginning");

  runner.it('should extend selection right 3 columns', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'Enter');
    type(node, 'Second line');

    // Move to beginning of first line
    dispatchKey(node, 'ArrowUp');
    dispatchKey(node, 'ArrowLeft', { meta: true });

    // Select right 3 columns
    repeatKey(node, 'ArrowRight', 3, { shift: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 3 });
  }, "Select right 3 columns");

  runner.it('should extend selection down 4 rows then right 3 columns', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'Enter');
    type(node, 'Line 3');
    dispatchKey(node, 'Enter');
    type(node, 'Line 4');
    dispatchKey(node, 'Enter');
    type(node, 'Line 5 with more text');

    // Move to beginning of first line
    repeatKey(node, 'ArrowUp', 4);
    dispatchKey(node, 'ArrowLeft', { meta: true });

    // Select down 4 rows
    repeatKey(node, 'ArrowDown', 4, { shift: true });

    // Then right 3 columns
    repeatKey(node, 'ArrowRight', 3, { shift: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 4, col: 3 });
  }, "Select down 4 rows then right 3 columns");

  runner.it('should extend selection from middle down 4 rows then right 3 columns', () => {
    type(node, 'Line 1 text');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2 text');
    dispatchKey(node, 'Enter');
    type(node, 'Line 3 text');
    dispatchKey(node, 'Enter');
    type(node, 'Line 4 text');
    dispatchKey(node, 'Enter');
    type(node, 'Line 5 with more text');

    // Move to col 5 of first line (after "Line ")
    repeatKey(node, 'ArrowUp', 4);
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowRight', 5);

    // Select down 4 rows
    repeatKey(node, 'ArrowDown', 4, { shift: true });

    // Then right 3 columns
    repeatKey(node, 'ArrowRight', 3, { shift: true });

    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 5 });
    expect(end).toEqual({ row: 4, col: 8 });
  }, "Select from middle down 4 rows then right 3 columns");
});

// Deleting selections with Backspace
runner.describe('Deleting selections', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should delete single line selection with Backspace', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Start at col 0
    repeatKey(node, 'ArrowRight', 5, { shift: true }); // Select to col 5

    dispatchKey(node, 'Backspace');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('World');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 0 });
  }, "Delete 'Hello ' from 'Hello World'");

  runner.it('should delete entire line with Backspace', () => {
    type(node, 'Delete me');
    dispatchKey(node, 'ArrowLeft', { meta: true });
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true }); // Select all

    dispatchKey(node, 'Backspace');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 0 });
  }, "Delete entire line");

  runner.it('should delete multi-line selection with Backspace', () => {
    type(node, 'First line');
    dispatchKey(node, 'Enter');
    type(node, 'Second line');
    dispatchKey(node, 'Enter');
    type(node, 'Third line');

    // Select from beginning of first to col 0 of third (includes 'T')
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowDown', 2, { shift: true });

    dispatchKey(node, 'Backspace');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines).toHaveLength(1);
    expect(wb.Model.lines[0]).toBe('hird line');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 0 });
  }, "Delete two full lines plus first character");

  runner.it('should delete partial multi-line selection with Backspace', () => {
    type(node, 'First line here');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'Enter');
    type(node, 'Third line here');

    // Select from middle of first (col 6) to middle of third (col 6)
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowRight', 6);
    repeatKey(node, 'ArrowDown', 2, { shift: true });

    dispatchKey(node, 'Backspace');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines).toHaveLength(1);
    expect(wb.Model.lines[0]).toBe('First ine here');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Delete partial multi-line selection");

  runner.it('should delete from middle to end across lines with Backspace', () => {
    type(node, 'First line');
    dispatchKey(node, 'Enter');
    type(node, 'Second line');

    // Select from middle of first line to end of second
    dispatchKey(node, 'ArrowUp');
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowRight', 6);
    dispatchKey(node, 'ArrowDown', { shift: true });
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true });

    dispatchKey(node, 'Backspace');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines).toHaveLength(1);
    expect(wb.Model.lines[0]).toBe('First ');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Delete from middle to end across lines");

  runner.it('should delete backward selection with Backspace', () => {
    type(node, 'Hello World');
    // Select backward from col 11 to col 6
    repeatKey(node, 'ArrowLeft', 5, { shift: true });

    dispatchKey(node, 'Backspace');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('Hello ');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Delete backward selection");
});

// Replacing selections by typing
runner.describe('Replacing selections', () => {
  let wb, node;

  runner.beforeEach(() => {
    const editor = createTestEditor();
    wb = editor.wb;
    node = editor.node;
  });

  runner.it('should replace single line selection with typed character', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true });
    // Select "Hello " (6 characters, positions 0-5)
    repeatKey(node, 'ArrowRight', 5, { shift: true });

    type(node, 'X');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('XWorld');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 1 });
    expect(end).toEqual({ row: 0, col: 1 });
  }, "Replace 'Hello ' with 'X'");

  runner.it('should replace selection with multiple characters', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true });
    // Select "Hello " (6 characters, positions 0-5)
    repeatKey(node, 'ArrowRight', 5, { shift: true });

    type(node, 'Goodbye');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('GoodbyeWorld');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 7 });
    expect(end).toEqual({ row: 0, col: 7 });
  }, "Replace 'Hello ' with 'Goodbye'");

  runner.it('should replace entire line with typed text', () => {
    type(node, 'Old text');
    dispatchKey(node, 'ArrowLeft', { meta: true });
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true });

    type(node, 'New');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('New');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 3 });
    expect(end).toEqual({ row: 0, col: 3 });
  }, "Replace entire line");

  runner.it('should replace multi-line selection with single character', () => {
    type(node, 'First line');
    dispatchKey(node, 'Enter');
    type(node, 'Second line');
    dispatchKey(node, 'Enter');
    type(node, 'Third line');

    // Select from start of first to start of third
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowDown', 2, { shift: true });

    type(node, 'X');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines).toHaveLength(1);
    expect(wb.Model.lines[0]).toBe('Xhird line');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 1 });
    expect(end).toEqual({ row: 0, col: 1 });
  }, "Replace multi-line selection with 'X'");

  runner.it('should replace multi-line selection with multiple characters', () => {
    type(node, 'First line');
    dispatchKey(node, 'Enter');
    type(node, 'Second line');
    dispatchKey(node, 'Enter');
    type(node, 'Third line');

    // Select from middle of first (col 6) to middle of third (col 6)
    repeatKey(node, 'ArrowUp', 2);
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowRight', 6);
    repeatKey(node, 'ArrowDown', 2, { shift: true });

    type(node, 'REPLACED');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines).toHaveLength(1);
    expect(wb.Model.lines[0]).toBe('First REPLACEDine');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 14 });
    expect(end).toEqual({ row: 0, col: 14 });
  }, "Replace partial multi-line with text");

  runner.it('should replace backward selection with typed text', () => {
    type(node, 'Hello World');
    // Select "World" backward
    repeatKey(node, 'ArrowLeft', 5, { shift: true });

    type(node, 'Everyone');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('Hello Everyone');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 14 });
    expect(end).toEqual({ row: 0, col: 14 });
  }, "Replace backward selection");

  runner.it('should replace selection with space', () => {
    type(node, 'HelloWorld');
    dispatchKey(node, 'ArrowLeft', { meta: true });
    repeatKey(node, 'ArrowRight', 5);
    repeatKey(node, 'ArrowRight', 5, { shift: true });

    dispatchKey(node, ' ');

    expect(wb.Selection.isSelection).toBe(false);
    expect(wb.Model.lines[0]).toBe('Hello ');
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 6 });
    expect(end).toEqual({ row: 0, col: 6 });
  }, "Replace 'World' with space");
});
