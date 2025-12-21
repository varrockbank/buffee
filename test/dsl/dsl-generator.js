/**
 * DSL Spec Generator - Converts DSL files to complete test spec files
 *
 * Handles:
 * - Suite structure (# headers)
 * - Test structure (## headers)
 * - Test descriptions (### headers)
 * - Test framework boilerplate
 * - Delegates line-by-line DSL conversion to DSLTranspiler
 */

class SpecGenerator {
  constructor(transpiler) {
    this.transpiler = transpiler;
    this.errors = [];
  }

  /**
   * Escape string for use in JavaScript string literals
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeString(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Generate complete spec.js from DSL source
   * @param {string} dslSource - Complete DSL source
   * @returns {Object} { code: string, errors: Array, duplicates: Array } - Generated JavaScript, compile errors, and duplicate test names
   */
  generate(dslSource) {
    // Clear previous errors
    this.errors = [];

    const lines = dslSource.split('\n');
    const output = [];
    const testNames = new Map(); // Track suite:test -> line number for duplicate detection
    const duplicates = [];

    // File header
    output.push('// Test definitions');
    output.push('// Generated from DSL');
    output.push('const runner = new TestRunner();');
    output.push('');
    output.push('// DSL source map for walkthrough');
    output.push('window.dslSourceMap = window.dslSourceMap || {};');
    output.push('');

    let currentSuite = null;
    let currentTest = null;
    let currentTestDescription = null;
    let currentTestDslLines = [];
    let currentTestJsLineCount = 0;
    let dslToJsLineMap = []; // Maps DSL line index to JS line index
    let currentTestStartLine = 0; // Track where current test starts

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Suite header: # Suite Name
      if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
        // Close previous test
        if (currentTest !== null) {
          const descParam = currentTestDescription ? `, "${this.escapeString(currentTestDescription)}"` : '';
          output.push(`  }${descParam});`);

          // Store DSL source and mapping in map
          const dslSource = currentTestDslLines.join('\\n');
          const lineMap = JSON.stringify(dslToJsLineMap);
          output.push(`  window.dslSourceMap['${this.escapeString(currentSuite)}:${this.escapeString(currentTest)}'] = { source: \`${dslSource}\`, lineMap: ${lineMap}, startLine: ${currentTestStartLine} };`);
          output.push('');
          currentTest = null;
          currentTestDescription = null;
        }

        // Close previous suite
        if (currentSuite !== null) {
          output.push('});');
          output.push('');
        }

        currentSuite = trimmed.substring(2).trim();
        output.push(`// ${currentSuite}`);
        output.push(`runner.describe('${this.escapeString(currentSuite)}', () => {`);
        output.push('  let fixture;');
        output.push('');
        output.push('  runner.beforeEach(() => {');
        output.push('    fixture = FixtureFactory.forTest();');
        output.push('  });');
        output.push('');

      // Test header: ## Test Name
      } else if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
        // Close previous test
        if (currentTest !== null) {
          const descParam = currentTestDescription ? `, "${this.escapeString(currentTestDescription)}"` : '';
          output.push(`  }${descParam});`);

          // Store DSL source and mapping in map
          const dslSource = currentTestDslLines.join('\\n');
          const lineMap = JSON.stringify(dslToJsLineMap);
          output.push(`  window.dslSourceMap['${this.escapeString(currentSuite)}:${this.escapeString(currentTest)}'] = { source: \`${dslSource}\`, lineMap: ${lineMap}, startLine: ${currentTestStartLine} };`);
          output.push('');
        }

        currentTest = trimmed.substring(3).trim();
        currentTestStartLine = i + 1; // 1-indexed line number

        // Check for duplicate test name
        const testKey = `${currentSuite}:${currentTest}`;
        if (testNames.has(testKey)) {
          duplicates.push({
            suite: currentSuite,
            test: currentTest,
            firstLine: testNames.get(testKey),
            secondLine: currentTestStartLine
          });
        } else {
          testNames.set(testKey, currentTestStartLine);
        }

        currentTestDescription = null;
        currentTestDslLines = [];
        currentTestJsLineCount = 0;
        dslToJsLineMap = [];
        output.push(`  runner.it('${this.escapeString(currentTest)}', () => {`);

      // Test description: ### Description
      } else if (trimmed.startsWith('### ')) {
        currentTestDescription = trimmed.substring(4).trim();

      // Test body content
      } else if (currentTest !== null) {
        const dslLineIndex = currentTestDslLines.length;

        // Empty line
        if (trimmed === '') {
          output.push('');
          currentTestDslLines.push('');
          dslToJsLineMap.push(currentTestJsLineCount);
          currentTestJsLineCount++;
        }
        // JavaScript pass-through (ends with semicolon or is a comment line)
        else if (trimmed.endsWith(';') || trimmed.startsWith('//')) {
          output.push(`    ${trimmed}`);
          currentTestDslLines.push(trimmed);
          dslToJsLineMap.push(currentTestJsLineCount);
          currentTestJsLineCount++;
        }
        // DSL command - delegate to transpiler
        else {
          try {
            const jsLine = this.transpiler.transpileLine(trimmed);
            if (jsLine) {
              output.push(`    ${jsLine}`);
              currentTestDslLines.push(trimmed);
              dslToJsLineMap.push(currentTestJsLineCount);
              currentTestJsLineCount++;
            }
          } catch (error) {
            // Store error for UI display
            this.errors.push({
              line: i + 1, // 1-indexed line number
              code: trimmed,
              message: error.message,
              suite: currentSuite,
              test: currentTest
            });

            // Include error as comment
            output.push(`    // Error transpiling: ${trimmed}`);
            output.push(`    // ${error.message}`);
            currentTestDslLines.push(`// OMITTED DUE TO ERROR: ${trimmed}`);
            dslToJsLineMap.push(currentTestJsLineCount);
            currentTestJsLineCount += 2; // Error is 2 lines
          }
        }
      }
      // Outside of any test - ignore
    }

    // Close last test
    if (currentTest !== null) {
      const descParam = currentTestDescription ? `, "${this.escapeString(currentTestDescription)}"` : '';
      output.push(`  }${descParam});`);

      // Store DSL source and mapping in map
      const dslSource = currentTestDslLines.join('\\n');
      const lineMap = JSON.stringify(dslToJsLineMap);
      output.push(`  window.dslSourceMap['${this.escapeString(currentSuite)}:${this.escapeString(currentTest)}'] = { source: \`${dslSource}\`, lineMap: ${lineMap} };`);
      output.push('');
    }

    // Close last suite
    if (currentSuite !== null) {
      output.push('});');
      output.push('');
    }

    // If duplicates found, generate error code instead
    if (duplicates.length > 0) {
      const errorOutput = [
        '// DUPLICATE TEST NAMES DETECTED',
        '// Cannot run tests with duplicate names',
        '',
        'throw new Error(`Duplicate test names detected:\\n' +
        duplicates.map(d =>
          `  - "${this.escapeString(d.suite)}" > "${this.escapeString(d.test)}" (lines ${d.firstLine} and ${d.secondLine})`
        ).join('\\n') +
        '`);',
        ''
      ];

      return {
        code: errorOutput.join('\n'),
        errors: this.errors,
        duplicates: duplicates
      };
    }

    return {
      code: output.join('\n'),
      errors: this.errors,
      duplicates: []
    };
  }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpecGenerator };
}
