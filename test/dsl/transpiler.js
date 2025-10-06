/**
 * DSL Transpiler - Converts natural language test DSL to JavaScript
 *
 * Follows DSL specification v3.1.0 with:
 * - v1.6.0 normalized forms
 * - v2.0.0 JavaScript interweaving (lines ending with `;`)
 * - v2.1.0 empty lines allowed
 * - v2.2.0 semicolon disambiguation (PRESS ';')
 * - v3.1.0 standalone comment lines (lines starting with `//`)
 */

class DSLTranspiler {
  constructor() {
    // Map short arrow forms to Key constants
    this.arrowKeyMap = {
      'left': 'ArrowLeft',
      'right': 'ArrowRight',
      'up': 'ArrowUp',
      'down': 'ArrowDown'
    };

    // Map special keys to Key constants
    this.specialKeyMap = {
      'backspace': 'Backspace',
      'enter': 'Enter'
    };
  }

  /**
   * Transpile DSL source to JavaScript
   * @param {string} source - DSL source code
   * @returns {string} JavaScript code
   */
  transpile(source) {
    const lines = source.split('\n');
    const output = [];

    for (const line of lines) {
      const transpiled = this.transpileLine(line);
      output.push(transpiled);
    }

    return output.join('\n');
  }

  /**
   * Transpile a single line
   * @param {string} line - Single line of DSL
   * @returns {string} Transpiled JavaScript line
   */
  transpileLine(line) {
    const trimmed = line.trim();

    // Empty line - pass through
    if (trimmed === '') {
      return '';
    }

    // JavaScript comment line (starts with //) - pass through
    if (trimmed.startsWith('//')) {
      return line;
    }

    // JavaScript line (ends with semicolon) - pass through
    if (trimmed.endsWith(';')) {
      return line;
    }

    // DSL command - parse and transpile
    return this.transpileDSLCommand(trimmed);
  }

  /**
   * Transpile a DSL command
   * @param {string} cmd - DSL command (trimmed)
   * @returns {string} JavaScript statement
   */
  transpileDSLCommand(cmd) {
    // TYPE command
    if (cmd.startsWith('TYPE ')) {
      return this.transpileTYPE(cmd);
    }

    // PRESS command (for single characters)
    if (cmd.startsWith('PRESS ')) {
      return this.transpilePRESS(cmd);
    }

    // EXPECT cursor at command (case-insensitive)
    if (cmd.toLowerCase().startsWith('expect cursor at ')) {
      return this.transpileExpectCursorAt(cmd);
    }

    // EXPECT selection at command (case-insensitive)
    if (cmd.toLowerCase().startsWith('expect selection at ')) {
      return this.transpileExpectSelectionAt(cmd);
    }

    // Special key commands (backspace, enter, arrow keys)
    return this.transpileSpecialKey(cmd);
  }

  /**
   * Transpile TYPE command
   * Example: TYPE "Hello World" → fixture.type('Hello World');
   */
  transpileTYPE(cmd) {
    const match = cmd.match(/^TYPE\s+"(.*)"/);
    if (!match) {
      throw new Error(`Invalid TYPE command: ${cmd}`);
    }

    const text = match[1];
    // Convert double-quoted string to single-quoted (escape any single quotes)
    const escaped = text.replace(/'/g, "\\'");
    return `fixture.type('${escaped}');`;
  }

  /**
   * Transpile PRESS command
   * Example: PRESS a → fixture.press('a').once();
   * Example: PRESS " " → fixture.press(' ').once();
   * Example: PRESS ';' → fixture.press(';').once();
   * Example: PRESS ';' 3 times → fixture.press(';').times(3);
   */
  transpilePRESS(cmd) {
    // Match: PRESS 'char' [quantification] or PRESS "char" [quantification] or PRESS char [quantification]
    const matchSingleQuoted = cmd.match(/^PRESS\s+'(.+?)'(?:\s+(\d+)\s+times?|\s+once)?$/);
    const matchDoubleQuoted = cmd.match(/^PRESS\s+"(.+?)"(?:\s+(\d+)\s+times?|\s+once)?$/);
    const matchUnquoted = cmd.match(/^PRESS\s+(.)(?:\s+(\d+)\s+times?|\s+once)?$/);

    let char;
    let quantification;
    if (matchSingleQuoted) {
      char = matchSingleQuoted[1];
      quantification = matchSingleQuoted[2];
    } else if (matchDoubleQuoted) {
      char = matchDoubleQuoted[1];
      quantification = matchDoubleQuoted[2];
    } else if (matchUnquoted) {
      char = matchUnquoted[1];
      quantification = matchUnquoted[2];
    } else {
      throw new Error(`Invalid PRESS command: ${cmd}`);
    }

    // Escape single quotes for JavaScript output
    const escaped = char.replace(/'/g, "\\'");

    // Add quantification
    if (quantification) {
      return `fixture.press('${escaped}').times(${quantification});`;
    } else {
      return `fixture.press('${escaped}').once();`;
    }
  }

  /**
   * Transpile EXPECT cursor at command
   * Example: EXPECT cursor at 0,1 → expect(fixture).toHaveCursorAt(0, 1);
   */
  transpileExpectCursorAt(cmd) {
    const match = cmd.match(/^expect cursor at (\d+),\s*(\d+)$/i);
    if (!match) {
      throw new Error(`Invalid EXPECT cursor at command: ${cmd}`);
    }

    const row = match[1];
    const col = match[2];
    return `expect(fixture).toHaveCursorAt(${row}, ${col});`;
  }

  /**
   * Transpile EXPECT selection at command
   * Example: EXPECT selection at 1,2-4,5 → expect(fixture).toHaveSelectionAt(1, 2, 4, 5);
   */
  transpileExpectSelectionAt(cmd) {
    const match = cmd.match(/^expect selection at (\d+),\s*(\d+)\s*-\s*(\d+),\s*(\d+)$/i);
    if (!match) {
      throw new Error(`Invalid EXPECT selection at command: ${cmd}`);
    }

    const startRow = match[1];
    const startCol = match[2];
    const endRow = match[3];
    const endCol = match[4];
    return `expect(fixture).toHaveSelectionAt(${startRow}, ${startCol}, ${endRow}, ${endCol});`;
  }

  /**
   * Transpile special key commands
   * Examples:
   *   backspace → fixture.press(Key.Backspace).once();
   *   backspace 5 times → fixture.press(Key.Backspace).times(5);
   *   left with meta → fixture.press(Key.ArrowLeft).withMetaKey().once();
   *   right 5 times with shift → fixture.press(Key.ArrowRight).withShiftKey().times(5);
   */
  transpileSpecialKey(cmd) {
    // Parse: <key> [quantification] [qualification]
    const pattern = /^(\w+)(?:\s+(\d+)\s+times?|\s+once)?(?:\s+with\s+([\w,\s]+))?$/i;
    const match = cmd.match(pattern);

    if (!match) {
      throw new Error(`Invalid command: ${cmd}`);
    }

    const keyName = match[1].toLowerCase();
    const quantification = match[2]; // undefined, or a number
    const qualifications = match[3]; // undefined, or "shift", "meta", "meta, shift", etc.

    // Determine the Key constant
    let keyConstant;
    if (this.arrowKeyMap[keyName]) {
      keyConstant = `Key.${this.arrowKeyMap[keyName]}`;
    } else if (this.specialKeyMap[keyName]) {
      keyConstant = `Key.${this.specialKeyMap[keyName]}`;
    } else {
      throw new Error(`Unknown key: ${keyName}`);
    }

    // Build the chain: fixture.press(Key.X)
    let chain = `fixture.press(${keyConstant})`;

    // Add modifiers (qualifications)
    if (qualifications) {
      const mods = qualifications.split(',').map(m => m.trim().toLowerCase());

      // Ensure meta comes before shift (v1.6.0 rule 8)
      const hasMeta = mods.includes('meta');
      const hasShift = mods.includes('shift');

      if (hasMeta) {
        chain += '.withMetaKey()';
      }
      if (hasShift) {
        chain += '.withShiftKey()';
      }
    }

    // Add quantification
    if (quantification) {
      chain += `.times(${quantification})`;
    } else {
      chain += '.once()';
    }

    return chain + ';';
  }
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DSLTranspiler };
}
