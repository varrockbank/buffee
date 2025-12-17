// Assertion library for Buffee tests

function expect(actual) {
  // Check if actual is an EditorTestHarness instance
  if (typeof EditorTestHarness !== 'undefined' && actual instanceof EditorTestHarness) {
    return {
      toHaveLines(...expectedLines) {
        if (actual.wb.Model.lines.length !== expectedLines.length) {
          throw new Error(`Expected ${expectedLines.length} lines, got ${actual.wb.Model.lines.length}`);
        }
        expectedLines.forEach((expected, i) => {
          if (actual.wb.Model.lines[i] !== expected) {
            throw new Error(`Expected line ${i} to be "${expected}", got "${actual.wb.Model.lines[i]}"`);
          }
        });
      },
      toHaveCursorAt(row, col) {
        const [firstEdge, secondEdge] = actual.wb.Selection.ordered;
        const isSelectionByReference = firstEdge !== secondEdge;

        // Check consistency between reference check and isSelection property
        if (isSelectionByReference !== actual.wb.Selection.isSelection) {
          throw new Error(`REGRESSION: Selection.isSelection (${actual.wb.Selection.isSelection}) is inconsistent with reference check (${isSelectionByReference})`);
        }

        // Check it's a cursor (firstEdge === secondEdge by reference)
        if (isSelectionByReference) {
          throw new Error(`Expected cursor but found selection`);
        }

        // firstEdge.row is already absolute (Model index)
        // Check coordinates (absolute row, 0-indexed)
        if (firstEdge.row !== row || firstEdge.col !== col) {
          throw new Error(`Expected cursor at {row: ${row}, col: ${col}}, got {row: ${firstEdge.row}, col: ${firstEdge.col}}`);
        }
      },
      toHaveSelectionAt(startRow, startCol, endRow, endCol) {
        const [firstEdge, secondEdge] = actual.wb.Selection.ordered;
        const isSelectionByReference = firstEdge !== secondEdge;

        // Check consistency between reference check and isSelection property
        if (isSelectionByReference !== actual.wb.Selection.isSelection) {
          throw new Error(`REGRESSION: Selection.isSelection (${actual.wb.Selection.isSelection}) is inconsistent with reference check (${isSelectionByReference})`);
        }

        // Check it's a selection (firstEdge !== secondEdge by reference)
        if (!isSelectionByReference) {
          throw new Error(`Expected selection but found cursor`);
        }

        // firstEdge.row and secondEdge.row are already absolute (Model indices)
        // Check coordinates (absolute rows, 0-indexed)
        if (firstEdge.row !== startRow || firstEdge.col !== startCol ||
            secondEdge.row !== endRow || secondEdge.col !== endCol) {
          throw new Error(`Expected selection at {row: ${startRow}, col: ${startCol}} to {row: ${endRow}, col: ${endCol}}, got {row: ${firstEdge.row}, col: ${firstEdge.col}} to {row: ${secondEdge.row}, col: ${secondEdge.col}}`);
        }
      }
    };
  }

  // Standard matchers for non-fixture values
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength(expected) {
      if (actual.length !== expected) {
        throw new Error(`Expected length: ${expected}\nActual length: ${actual.length}\nActual value: ${JSON.stringify(actual)}`);
      }
    }
  };
}
