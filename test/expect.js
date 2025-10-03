// Assertion library for WarrenBuf tests

function expect(actual) {
  // Check if actual is an EditorFixture instance
  if (typeof EditorFixture !== 'undefined' && actual instanceof EditorFixture) {
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
