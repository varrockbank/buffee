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
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 1 });
    expect(tail).toEqual({ row: 0, col: 1 });
  }, "Insert single character 'a'");

  runner.it('should insert multiple characters', () => {
    type(node, 'Hello');
    expect(wb.Model.lines[0]).toBe('Hello');
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 5 });
    expect(tail).toEqual({ row: 0, col: 5 });
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
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
    expect(wb.Model.lines[0]).toBe('He');
  }, "Delete 3 chars from 'Hello' → 'He'");

  runner.it('should delete all characters', () => {
    type(node, 'Hi');
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
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
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
    type(node, 'y there');
    expect(wb.Model.lines[0]).toBe('Hely there');
  }, "Type, delete, retype");

  runner.it('should create line, delete line break', () => {
    type(node, 'Hello');
    dispatchKey(node, 'Enter');
    type(node, 'World');
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
    dispatchKey(node, 'Backspace');
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
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 5 });
    expect(tail).toEqual({ row: 0, col: 5 });
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
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 0 });
    expect(tail).toEqual({ row: 0, col: 1 });
  }, "Select one character with Shift+ArrowRight");

  runner.it('should create selection with Shift+ArrowLeft', () => {
    type(node, 'Hello');
    dispatchKey(node, 'ArrowLeft', { shift: true }); // Select 1 char backward
    expect(wb.Selection.isSelection).toBe(true);
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 4 });
    expect(tail).toEqual({ row: 0, col: 5 });
  }, "Select one character with Shift+ArrowLeft");

  runner.it('should create multi-line selection with Shift+ArrowDown', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'ArrowUp');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Start of Line 1
    dispatchKey(node, 'ArrowDown', { shift: true }); // Select to Line 2
    expect(wb.Selection.isSelection).toBe(true);
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 0 });
    expect(tail).toEqual({ row: 1, col: 0 });
  }, "Select multiple lines with Shift+ArrowDown");

  runner.it('should move cursor up without selection', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'ArrowUp');
    expect(wb.Selection.isSelection).toBe(false);
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 6 });
    expect(tail).toEqual({ row: 0, col: 6 });
  }, "Move cursor up without selection");

  runner.it('should create multi-line selection with Shift+ArrowUp', () => {
    type(node, 'Line 1');
    dispatchKey(node, 'Enter');
    type(node, 'Line 2');
    dispatchKey(node, 'ArrowUp', { shift: true });
    expect(wb.Selection.isSelection).toBe(true);
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 6 });
    expect(tail).toEqual({ row: 1, col: 6 });
  }, "Select upward with Shift+ArrowUp");

  runner.it('should extend selection with multiple Shift+Arrow', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Start
    dispatchKey(node, 'ArrowRight', { shift: true }); // H
    dispatchKey(node, 'ArrowRight', { shift: true }); // He
    dispatchKey(node, 'ArrowRight', { shift: true }); // Hel
    dispatchKey(node, 'ArrowRight', { shift: true }); // Hell
    dispatchKey(node, 'ArrowRight', { shift: true }); // Hello
    expect(wb.Selection.isSelection).toBe(true);
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 0 });
    expect(tail).toEqual({ row: 0, col: 5 });
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
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 5 });
    expect(tail).toEqual({ row: 0, col: 5 });
  }, "Long to short: cursor at end of short line");

  runner.it('should restore column when moving back to long line', () => {
    type(node, 'Short');
    dispatchKey(node, 'Enter');
    type(node, 'Much longer line');
    // Assert cursor position after typing
    let [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 1, col: 16 }); // One past last char
    expect(tail).toEqual({ row: 1, col: 16 });

    dispatchKey(node, 'ArrowUp');  // Move to "Short", col clamped to 5
    dispatchKey(node, 'ArrowDown'); // Move back to "Much longer line"
    [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 1, col: 16 }); // Should restore to col 16
    expect(tail).toEqual({ row: 1, col: 16 });
  }, "Should restore original column when moving back");

  runner.it('should clamp column to line end on shorter line', () => {
    type(node, 'A');
    dispatchKey(node, 'Enter');
    type(node, 'Very long line here');
    dispatchKey(node, 'ArrowUp');
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 1 }); // Clamped to end of "A"
    expect(tail).toEqual({ row: 0, col: 1 });
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
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 8 }); // End of "Line one"
    expect(tail).toEqual({ row: 0, col: 8 });
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
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 11 });
    expect(tail).toEqual({ row: 0, col: 11 });
  }, "Meta+Right moves to end of line");

  runner.it('should move to start of line with Meta+Left', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Move to start
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 0 });
    expect(tail).toEqual({ row: 0, col: 0 });
  }, "Meta+Left moves to start of line");

  runner.it('should move to start of line from middle', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft'); // Move back one
    dispatchKey(node, 'ArrowLeft');
    dispatchKey(node, 'ArrowLeft');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Jump to start
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 0 });
    expect(tail).toEqual({ row: 0, col: 0 });
  }, "Meta+Left from middle of line");

  runner.it('should work on multi-line document', () => {
    type(node, 'First line');
    dispatchKey(node, 'Enter');
    type(node, 'Second line here');
    dispatchKey(node, 'ArrowLeft', { meta: true }); // Start of line 2
    let [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 1, col: 0 });
    expect(tail).toEqual({ row: 1, col: 0 });

    dispatchKey(node, 'ArrowRight', { meta: true }); // End of line 2
    [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 1, col: 16 });
    expect(tail).toEqual({ row: 1, col: 16 });
  }, "Meta+Left/Right on second line");

  runner.it('should work when navigating between lines', () => {
    type(node, 'Short');
    dispatchKey(node, 'Enter');
    type(node, 'Much longer line');
    dispatchKey(node, 'ArrowUp'); // Move to line 1
    dispatchKey(node, 'ArrowRight', { meta: true }); // End of line 1
    const [head, tail] = wb.Selection.ordered;
    expect(head).toEqual({ row: 0, col: 5 });
    expect(tail).toEqual({ row: 0, col: 5 });
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
    dispatchKey(node, 'ArrowLeft'); // Back 1
    dispatchKey(node, 'ArrowLeft'); // Back 2
    dispatchKey(node, 'ArrowLeft'); // Back 3 (at 'o')
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true }); // Select to end
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 8 });
    expect(end).toEqual({ row: 0, col: 11 });
  }, "Shift+Meta+Right from middle selects to end");

  runner.it('should select from middle to start', () => {
    type(node, 'Hello World');
    dispatchKey(node, 'ArrowLeft'); // Back 1
    dispatchKey(node, 'ArrowLeft'); // Back 2
    dispatchKey(node, 'ArrowLeft'); // Back 3 (at col 8)
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
    dispatchKey(node, 'ArrowRight', { shift: true }); // Select 'H'
    dispatchKey(node, 'ArrowRight', { shift: true }); // Select 'He'
    dispatchKey(node, 'ArrowRight', { shift: true, meta: true }); // Extend to end
    expect(wb.Selection.isSelection).toBe(true);
    const [start, end] = wb.Selection.ordered;
    expect(start).toEqual({ row: 0, col: 0 });
    expect(end).toEqual({ row: 0, col: 16 });
  }, "Extend selection to end with Shift+Meta+Right");
});
