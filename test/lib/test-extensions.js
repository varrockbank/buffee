/**
 * Buffee Extension Tests
 *
 * Tests for Buffee extensions:
 * - Syntax Highlighting
 * - Elementals
 * - TUI Legacy
 * - UltraHighCapacity
 */

// ===========================================
// Extension Test Runner
// ===========================================

class ExtensionTestRunner {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
    }

    describe(name, fn) {
        this.currentSuite = { name, tests: [], results: [] };
        this.suites.push(this.currentSuite);
        fn();
        this.currentSuite = null;
    }

    it(name, fn) {
        if (this.currentSuite) {
            this.currentSuite.tests.push({ name, fn });
        }
    }

    async run() {
        let passed = 0, failed = 0, total = 0;

        for (const suite of this.suites) {
            for (const test of suite.tests) {
                total++;
                try {
                    await test.fn();
                    suite.results.push({ name: test.name, status: 'pass' });
                    passed++;
                } catch (error) {
                    suite.results.push({ name: test.name, status: 'fail', error });
                    failed++;
                }
            }
        }

        return { total, passed, failed };
    }

    clear() {
        this.suites = [];
    }
}

const extRunner = new ExtensionTestRunner();

// ===========================================
// Assertion Helpers
// ===========================================

function assertEqual(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertDeepEqual(actual, expected, msg = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertTrue(value, msg = '') {
    if (!value) {
        throw new Error(msg || 'Expected true, got false');
    }
}

function assertFalse(value, msg = '') {
    if (value) {
        throw new Error(msg || 'Expected false, got true');
    }
}

// ===========================================
// Test Editor Factory
// ===========================================

function createTestEditor(opts = {}) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; width: 600px; height: 400px; visibility: hidden;';
    container.innerHTML = `
        <div class="buffee no-select">
            <textarea class="buffee-clipboard-bridge" aria-hidden="true"></textarea>
            <div class="no-select buffee-elements">
                <div class="buffee-gutter"></div>
                <div class="buffee-lines" tabindex="0"><blockquote class="buffee-layer-text"></blockquote><div class="buffee-layer-elements"></div><div class="buffee-cursor"></div></div>
            </div>
            <div class="buffee-status" style="display: flex; justify-content: space-between;">
                <div class="buffee-status-left"><span class="buffee-linecount"></span></div>
                <div class="buffee-status-right">
                    Ln <span class="buffee-head-row"></span>, Col <span class="buffee-head-col"></span>|

                    <span class="buffee-spaces"></span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    const el = container.querySelector('.buffee');
    const editor = new Buffee(el, { rows: 10, ...opts });
    return { editor, container, cleanup: () => container.remove() };
}

// ===========================================
// Extension Test Definitions
// ===========================================

function defineExtensionTests() {
    extRunner.clear();

    // ===== SYNTAX HIGHLIGHTING TESTS =====
    extRunner.describe('Syntax Highlighting', () => {
        extRunner.it('tokenizes JavaScript keywords', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeSyntax(editor);
                editor.Syntax.setLanguage('javascript');
                editor.Syntax.enabled = true;
                editor.Model.text = 'const x = 42;';

                const { tokens } = editor.Syntax.tokenizeLine('const x = 42;', 0);
                assertTrue(tokens.length > 0, 'Should have tokens');
                assertEqual(tokens[0].type, 'keyword', 'First token should be keyword');
                assertEqual(tokens[0].text, 'const', 'Keyword should be "const"');
            } finally {
                cleanup();
            }
        });

        extRunner.it('tokenizes JavaScript strings', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeSyntax(editor);
                editor.Syntax.setLanguage('javascript');
                const { tokens } = editor.Syntax.tokenizeLine('"hello world"', 0);
                const stringToken = tokens.find(t => t.type === 'string');
                assertTrue(!!stringToken, 'Should find string token');
            } finally {
                cleanup();
            }
        });

        extRunner.it('handles multiline comments', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeSyntax(editor);
                editor.Syntax.setLanguage('javascript');
                editor.Model.text = '/* start\nmiddle\nend */';

                // First line starts comment
                const result1 = editor.Syntax.tokenizeLine('/* start', 0);
                assertTrue(result1.endState > 0, 'Should enter multiline state');

                // Middle line continues comment
                const result2 = editor.Syntax.tokenizeLine('middle', result1.endState);
                assertTrue(result2.endState > 0, 'Should stay in multiline state');

                // Last line ends comment
                const result3 = editor.Syntax.tokenizeLine('end */', result2.endState);
                assertEqual(result3.endState, 0, 'Should return to normal state');
            } finally {
                cleanup();
            }
        });

        extRunner.it('invalidates state cache on edit', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeSyntax(editor);
                editor.Syntax.setLanguage('javascript');
                editor.Syntax.enabled = true;
                editor.Model.text = 'line1\nline2\nline3';

                // Force state cache population
                editor.Syntax.ensureStateCache(2);
                assertTrue(editor.Syntax.stateCache.length >= 3, 'State cache should be populated');

                // Simulate edit by setting text
                editor.Model.text = 'changed';
                assertEqual(editor.Syntax.stateCache.length, 1, 'State cache should be reset');
            } finally {
                cleanup();
            }
        });

        extRunner.it('supports multiple languages', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeSyntax(editor);

                // Test JavaScript
                editor.Syntax.setLanguage('javascript');
                let { tokens } = editor.Syntax.tokenizeLine('function test() {}', 0);
                assertTrue(tokens.some(t => t.type === 'keyword'), 'JS should have keyword');

                // Test Python
                editor.Syntax.setLanguage('python');
                ({ tokens } = editor.Syntax.tokenizeLine('def test():', 0));
                assertTrue(tokens.some(t => t.type === 'keyword'), 'Python should have keyword');

                // Test CSS
                editor.Syntax.setLanguage('css');
                ({ tokens } = editor.Syntax.tokenizeLine('.class { color: red; }', 0));
                assertTrue(tokens.length > 0, 'CSS should have tokens');
            } finally {
                cleanup();
            }
        });
    });

    // ===== ELEMENTALS TESTS =====
    extRunner.describe('Elementals', () => {
        extRunner.it('adds button elements', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeElementals(editor);
                editor.Model.text = '\n\n\n';
                const id = editor.Elementals.addButton({
                    row: 1, col: 5, label: 'Test'
                });
                assertTrue(id > 0, 'Should return element ID');
                assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                assertEqual(editor.Elementals.elements[0].type, 'button', 'Should be button type');
            } finally {
                cleanup();
            }
        });

        extRunner.it('adds label elements', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeElementals(editor);
                editor.Model.text = '\n\n\n';
                editor.Elementals.addLabel({ row: 1, col: 5, text: 'Label' });
                assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                assertEqual(editor.Elementals.elements[0].type, 'label', 'Should be label type');
            } finally {
                cleanup();
            }
        });

        extRunner.it('adds input elements', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeElementals(editor);
                editor.Model.text = '\n\n\n';
                editor.Elementals.addInput({
                    row: 1, col: 5, width: 20, placeholder: 'Type here'
                });
                assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                assertEqual(editor.Elementals.elements[0].type, 'input', 'Should be input type');
            } finally {
                cleanup();
            }
        });

        extRunner.it('navigates between elements', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeElementals(editor);
                editor.Model.text = '\n\n\n\n\n';
                editor.Elementals.addButton({ row: 1, col: 2, label: 'A' });
                editor.Elementals.addButton({ row: 2, col: 2, label: 'B' });
                editor.Elementals.addButton({ row: 3, col: 2, label: 'C' });
                editor.Elementals.enabled = true;

                const focusable = editor.Elementals.getFocusableElements();
                assertEqual(focusable.length, 3, 'Should have 3 focusable elements');
            } finally {
                cleanup();
            }
        });

        extRunner.it('removes elements', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeElementals(editor);
                editor.Model.text = '\n\n\n';
                const id = editor.Elementals.addButton({ row: 1, col: 2, label: 'Test' });
                assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                editor.Elementals.removeElement(id);
                assertEqual(editor.Elementals.elements.length, 0, 'Should have 0 elements after removal');
            } finally {
                cleanup();
            }
        });

        extRunner.it('clears all elements', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeElementals(editor);
                editor.Model.text = '\n\n\n';
                editor.Elementals.addButton({ row: 1, col: 2, label: 'A' });
                editor.Elementals.addButton({ row: 2, col: 2, label: 'B' });
                assertEqual(editor.Elementals.elements.length, 2, 'Should have 2 elements');
                editor.Elementals.clear();
                assertEqual(editor.Elementals.elements.length, 0, 'Should have 0 elements after clear');
            } finally {
                cleanup();
            }
        });
    });

    // ===== TUI LEGACY TESTS =====
    extRunner.describe('TUI Legacy', () => {
        extRunner.it('initializes TUI extension', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeTUI(editor);
                assertTrue(!!editor.TUI, 'TUI should be attached to editor');
                assertFalse(editor.TUI.enabled, 'TUI should be disabled by default');
            } finally {
                cleanup();
            }
        });

        extRunner.it('adds buttons', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeTUI(editor);
                editor.Model.text = '\n\n\n';
                const id = editor.TUI.addButton({
                    row: 1, col: 2, label: ' OK '
                });
                assertTrue(id > 0, 'Should return element ID');
                assertEqual(editor.TUI.elements.length, 1, 'Should have 1 element');
            } finally {
                cleanup();
            }
        });

        extRunner.it('adds buttons with borders', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeTUI(editor);
                editor.Model.text = '\n\n\n\n';
                const id = editor.TUI.addButton({
                    row: 1, col: 2, label: 'OK', border: true
                });
                assertTrue(id > 0, 'Should return element ID');
                // Bordered buttons have 3 content lines (top border, label, bottom border)
                assertEqual(editor.TUI.elements[0].contents.length, 3, 'Bordered button should have 3 content lines');
            } finally {
                cleanup();
            }
        });

        extRunner.it('handles navigation', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeTUI(editor);
                editor.Model.text = '\n\n\n\n';
                editor.TUI.addButton({ row: 1, col: 2, label: 'A' });
                editor.TUI.addButton({ row: 2, col: 2, label: 'B' });
                editor.TUI.enabled = true;

                // TUI uses elements array directly
                assertEqual(editor.TUI.elements.length, 2, 'Should have 2 elements');
            } finally {
                cleanup();
            }
        });

        extRunner.it('clears elements', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeTUI(editor);
                editor.Model.text = '\n\n\n';
                editor.TUI.addButton({ row: 1, col: 2, label: 'Test' });
                editor.TUI.clear();
                assertEqual(editor.TUI.elements.length, 0, 'Should have 0 elements after clear');
            } finally {
                cleanup();
            }
        });
    });

    // ===== HISTORY TESTS =====
    extRunner.describe('History', () => {
        extRunner.it('attaches History object to editor', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                assertTrue(!editor.History, 'History should not exist before extension');
                BuffeeHistory(editor);
                assertTrue(!!editor.History, 'History should be attached after extension');
                assertTrue(typeof editor.History.undo === 'function', 'Should have undo method');
                assertTrue(typeof editor.History.redo === 'function', 'Should have redo method');
                assertTrue(typeof editor.History.clear === 'function', 'Should have clear method');
            } finally {
                cleanup();
            }
        });

        extRunner.it('undoes single character insert', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('A');
                assertEqual(editor.Model.lines[0], 'A', 'Should have "A"');
                editor.History.undo();
                assertEqual(editor.Model.lines[0], '', 'Should be empty after undo');
            } finally {
                cleanup();
            }
        });

        extRunner.it('redoes single character insert', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('A');
                editor.History.undo();
                assertEqual(editor.Model.lines[0], '', 'Should be empty after undo');
                editor.History.redo();
                assertEqual(editor.Model.lines[0], 'A', 'Should have "A" after redo');
            } finally {
                cleanup();
            }
        });

        extRunner.it('undoes coalesced characters', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('A');
                editor.Selection.insert('B');
                editor.Selection.insert('C');
                assertEqual(editor.Model.lines[0], 'ABC', 'Should have "ABC"');
                editor.History.undo();
                assertEqual(editor.Model.lines[0], '', 'Should be empty after single undo (coalesced)');
            } finally {
                cleanup();
            }
        });

        extRunner.it('undoes backspace', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('AB');
                // Wait to break coalescing
                editor.History._lastOpTime = 0;
                editor.Selection.delete();
                assertEqual(editor.Model.lines[0], 'A', 'Should have "A" after backspace');
                editor.History.undo();
                assertEqual(editor.Model.lines[0], 'AB', 'Should have "AB" after undo');
            } finally {
                cleanup();
            }
        });

        extRunner.it('undoes newline', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('Hello');
                editor.History._lastOpTime = 0;
                editor.Selection.newLine();
                editor.History._lastOpTime = 0;
                editor.Selection.insert('World');
                assertEqual(editor.Model.lines.length, 2, 'Should have 2 lines');
                editor.History.undo();
                assertEqual(editor.Model.lines[1], '', 'Second line should be empty after undo');
                editor.History.undo();
                assertEqual(editor.Model.lines.length, 1, 'Should have 1 line after undo newline');
            } finally {
                cleanup();
            }
        });

        extRunner.it('clears redo stack on new edit', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('A');
                editor.History.undo();
                assertEqual(editor.History.redoStack.length, 1, 'Should have 1 redo item');
                editor.Selection.insert('B');
                assertEqual(editor.History.redoStack.length, 0, 'Redo stack should be cleared');
            } finally {
                cleanup();
            }
        });

        extRunner.it('restores cursor position on undo', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('Hello');
                assertEqual(editor._internals.head.col, 5, 'Cursor should be at col 5');
                editor.History.undo();
                assertEqual(editor._internals.head.col, 0, 'Cursor should be at col 0 after undo');
            } finally {
                cleanup();
            }
        });

        extRunner.it('restores cursor position on redo', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('AB');
                editor.History.undo();
                assertEqual(editor._internals.head.col, 0, 'Cursor should be at col 0 after undo');
                editor.History.redo();
                assertEqual(editor._internals.head.col, 2, 'Cursor should be at col 2 after redo');
            } finally {
                cleanup();
            }
        });

        extRunner.it('clears undo and redo stacks', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                editor.Selection.insert('A');
                editor.Selection.insert('B');
                assertTrue(editor.History.undoStack.length > 0, 'Should have undo items');
                editor.History.clear();
                assertEqual(editor.History.undoStack.length, 0, 'Undo stack should be empty');
                assertEqual(editor.History.redoStack.length, 0, 'Redo stack should be empty');
            } finally {
                cleanup();
            }
        });

        // Selection replacement should be atomic (single undo)
        extRunner.it('undoes selection replacement atomically', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                // Type "Hello World"
                editor.Selection.insert('Hello World');
                editor.History._lastOpTime = 0;

                // Select "Hello" (first 5 chars)
                editor.Selection.makeSelection();
                editor._internals.head.col = 0;
                editor._internals.tail.col = 5;

                // Replace selection with "Hi"
                editor.Selection.insert('Hi');
                assertEqual(editor.Model.lines[0], 'Hi World', 'Should have replaced "Hello" with "Hi"');

                // Single undo should restore "Hello World"
                editor.History.undo();
                assertEqual(editor.Model.lines[0], 'Hello World', 'Single undo should restore original text');
            } finally {
                cleanup();
            }
        });

        // Regression: head/tail references can change after makeSelection()
        extRunner.it('captures correct cursor after selection operations', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeHistory(editor);
                // Type some text
                editor.Selection.insert('Hello World');
                editor.History._lastOpTime = 0;

                // Make a selection (this changes head to detachedHead internally)
                editor.Selection.makeSelection();
                // Move cursor to create selection
                editor._internals.head.col = 5;

                // Delete the selection - this should capture correct cursor state
                editor.Selection.delete();
                assertEqual(editor.Model.lines[0], 'Hello', 'Should have deleted " World"');

                // Undo should restore both the text AND correct cursor position
                editor.History.undo();
                assertEqual(editor.Model.lines[0], 'Hello World', 'Text should be restored');
                // Verify cursor is at correct position (start of selection, col 5)
                assertEqual(editor._internals.head.col, 5, 'Cursor should be restored to selection start');
            } finally {
                cleanup();
            }
        });
    });

    // ===== UNDO TREE TESTS =====
    extRunner.describe('UndoTree', () => {
        extRunner.it('attaches UndoTree object to editor', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                assertTrue(!editor.UndoTree, 'UndoTree should not exist before extension');
                BuffeeUndoTree(editor);
                assertTrue(!!editor.UndoTree, 'UndoTree should be attached after extension');
                assertTrue(typeof editor.UndoTree.undo === 'function', 'Should have undo method');
                assertTrue(typeof editor.UndoTree.redo === 'function', 'Should have redo method');
                assertTrue(typeof editor.UndoTree.branches === 'function', 'Should have branches method');
                assertTrue(typeof editor.UndoTree.goToNode === 'function', 'Should have goToNode method');
            } finally {
                cleanup();
            }
        });

        extRunner.it('undoes and redoes single insert', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUndoTree(editor);
                editor.Selection.insert('A');
                assertEqual(editor.Model.lines[0], 'A', 'Should have "A"');
                editor.UndoTree.undo();
                assertEqual(editor.Model.lines[0], '', 'Should be empty after undo');
                editor.UndoTree.redo();
                assertEqual(editor.Model.lines[0], 'A', 'Should have "A" after redo');
            } finally {
                cleanup();
            }
        });

        extRunner.it('creates branches instead of discarding redo', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUndoTree(editor);
                editor.Selection.insert('A');
                editor.UndoTree._lastOpTime = 0; // Break coalescing
                editor.UndoTree.undo();

                // Make a new edit - should create branch, not discard
                editor.Selection.insert('B');

                // Root should have 2 children (branches)
                const tree = editor.UndoTree.getTree();
                assertEqual(tree.children.length, 2, 'Root should have 2 branches');
            } finally {
                cleanup();
            }
        });

        extRunner.it('navigates between branches', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUndoTree(editor);

                // Create first branch
                editor.Selection.insert('A');
                editor.UndoTree._lastOpTime = 0;
                editor.UndoTree.undo();

                // Create second branch
                editor.Selection.insert('B');
                editor.UndoTree._lastOpTime = 0;
                assertEqual(editor.Model.lines[0], 'B', 'Should be on B branch');

                // Go back and take first branch
                editor.UndoTree.undo();
                editor.UndoTree.redo(0); // First branch (A)
                assertEqual(editor.Model.lines[0], 'A', 'Should be on A branch');

                // Go back and take second branch
                editor.UndoTree.undo();
                editor.UndoTree.redo(1); // Second branch (B)
                assertEqual(editor.Model.lines[0], 'B', 'Should be on B branch again');
            } finally {
                cleanup();
            }
        });

        extRunner.it('reports available branches', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUndoTree(editor);

                editor.Selection.insert('A');
                editor.UndoTree._lastOpTime = 0;
                editor.UndoTree.undo();
                editor.Selection.insert('B');
                editor.UndoTree._lastOpTime = 0;
                editor.UndoTree.undo();

                const branches = editor.UndoTree.branches();
                assertEqual(branches.length, 2, 'Should have 2 branches');
                assertEqual(branches[0].operation.text, 'A', 'First branch should be A');
                assertEqual(branches[1].operation.text, 'B', 'Second branch should be B');
            } finally {
                cleanup();
            }
        });

        extRunner.it('jumps to any node via goToNode', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUndoTree(editor);

                // Create: root -> A -> B -> C
                editor.Selection.insert('A');
                editor.UndoTree._lastOpTime = 0;
                const nodeAId = editor.UndoTree.current.id;
                editor.Selection.insert('B');
                editor.UndoTree._lastOpTime = 0;
                editor.Selection.insert('C');
                editor.UndoTree._lastOpTime = 0;

                assertEqual(editor.Model.lines[0], 'ABC', 'Should have ABC');

                // Jump directly to node A
                editor.UndoTree.goToNode(nodeAId);
                assertEqual(editor.Model.lines[0], 'A', 'Should have just A after jump');
            } finally {
                cleanup();
            }
        });

        extRunner.it('returns tree structure for visualization', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUndoTree(editor);
                editor.Selection.insert('X');

                const tree = editor.UndoTree.getTree();
                assertEqual(tree.id, 0, 'Root should have id 0');
                assertTrue(tree.children.length > 0, 'Should have children');
                assertTrue(tree.children[0].isCurrent, 'Child should be current');
                assertEqual(tree.children[0].operation.type, 'insert', 'Should be insert operation');
            } finally {
                cleanup();
            }
        });

        extRunner.it('clears all history', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUndoTree(editor);
                editor.Selection.insert('A');
                editor.Selection.insert('B');

                assertTrue(editor.UndoTree.canUndo, 'Should be able to undo');
                editor.UndoTree.clear();
                assertFalse(editor.UndoTree.canUndo, 'Should not be able to undo after clear');
            } finally {
                cleanup();
            }
        });
    });

    // ===== ULTRAHIGHCAPACITY TESTS =====
    extRunner.describe('UltraHighCapacity', () => {
        extRunner.it('initializes UltraHighCapacity extension', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUltraHighCapacity(editor);
                assertTrue(!!editor.UltraHighCapacity, 'UltraHighCapacity should be attached to editor');
                assertFalse(editor.UltraHighCapacity.enabled, 'Should be disabled by default');
            } finally {
                cleanup();
            }
        });

        extRunner.it('activates chunked mode', () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUltraHighCapacity(editor);
                editor.UltraHighCapacity.activate(1000);
                assertTrue(editor.UltraHighCapacity.enabled, 'Should be enabled after activate');
                assertEqual(editor.UltraHighCapacity.totalLines, 0, 'Should start with 0 lines');
            } finally {
                cleanup();
            }
        });

        extRunner.it('tracks total lines after append', async () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUltraHighCapacity(editor);
                editor.UltraHighCapacity.activate(1000);

                // Append some lines
                await editor.UltraHighCapacity.appendLines(['line1', 'line2', 'line3']);
                assertEqual(editor.UltraHighCapacity.totalLines, 3, 'Should have 3 total lines');
            } finally {
                cleanup();
            }
        });

        extRunner.it('clears chunk data', async () => {
            const { editor, cleanup } = createTestEditor();
            try {
                BuffeeUltraHighCapacity(editor);
                editor.UltraHighCapacity.activate(1000);
                await editor.UltraHighCapacity.appendLines(['line1', 'line2']);
                assertEqual(editor.UltraHighCapacity.totalLines, 2, 'Should have 2 lines');

                editor.UltraHighCapacity.clear();
                assertEqual(editor.UltraHighCapacity.totalLines, 0, 'Should have 0 lines after clear');
            } finally {
                cleanup();
            }
        });
    });
}

// ===========================================
// Results Rendering
// ===========================================

function renderExtensionResults(results) {
    const resultsContainer = document.getElementById('ext-test-results');
    resultsContainer.innerHTML = '';

    extRunner.suites.forEach(suite => {
        const suiteDiv = document.createElement('div');
        suiteDiv.className = 'test-suite';

        const passedInSuite = suite.results.filter(t => t.status === 'pass').length;
        const failedInSuite = suite.results.filter(t => t.status === 'fail').length;

        const suiteHeader = document.createElement('div');
        suiteHeader.className = 'test-suite-header';
        suiteHeader.innerHTML = `
            <div>
                <span>${suite.name}</span>
                <span style="margin-left: 12px; opacity: 0.7; font-size: 12px;">
                    ${passedInSuite} passed, ${failedInSuite} failed
                </span>
            </div>
            <span class="toggle-icon">▼</span>
        `;
        suiteHeader.onclick = () => suiteDiv.classList.toggle('collapsed');

        const suiteBody = document.createElement('div');
        suiteBody.className = 'test-suite-body';

        suite.results.forEach(test => {
            const testDiv = document.createElement('div');
            testDiv.className = `test-case ${test.status}`;
            const icon = test.status === 'pass' ? '✓' : '✗';

            testDiv.innerHTML = `
                <span class="test-icon ${test.status}">${icon}</span>
                <div class="test-message">
                    ${test.name}
                    ${test.error ? `<div class="test-error">${test.error.message}</div>` : ''}
                </div>
            `;

            suiteBody.appendChild(testDiv);
        });

        suiteDiv.appendChild(suiteHeader);
        suiteDiv.appendChild(suiteBody);
        resultsContainer.appendChild(suiteDiv);
    });

    document.getElementById('ext-total-tests').textContent = results.total;
    document.getElementById('ext-passed-tests').textContent = results.passed;
    document.getElementById('ext-failed-tests').textContent = results.failed;
}

// ===========================================
// Run Extension Tests
// ===========================================

async function runExtensionTests() {
    const startTime = new Date();

    defineExtensionTests();
    const results = await extRunner.run();

    const endTime = new Date();
    const duration = endTime - startTime;

    const timingDiv = document.getElementById('ext-test-timing');
    timingDiv.innerHTML = `
        <span class="icon">⏱️</span>
        <span class="duration">Runtime: ${duration} ms</span>
    `;

    renderExtensionResults(results);
}

// Run extension tests on page load
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(runExtensionTests, 500);
});
