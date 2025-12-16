/**
 * @fileoverview VbufSyntax - Regex-based syntax highlighting for Vbuf.
 * Uses incremental tokenization with state caching for efficient updates.
 * @version 1.0.0
 */

/**
 * Initializes syntax highlighting extension for a Vbuf instance.
 *
 * @param {Vbuf} vbuf - The Vbuf instance to extend
 * @returns {Object} The Syntax API object
 */
function VbufSyntax(vbuf) {
  const { $e, renderHooks } = vbuf._internals;
  const { Viewport, Model, History } = vbuf;

  // State cache: stateCache[lineIndex] = startState for that line
  // State 0 = NORMAL, other states defined by language
  const stateCache = [0];

  // Current language definition
  let language = null;
  let enabled = false;

  // ============================================================================
  // Hook into History and Model to detect edits and invalidate state cache
  // ============================================================================

  // Hook History._insert
  const originalInsert = History._insert.bind(History);
  History._insert = function(row, col, text, recordHistory, combined) {
    originalInsert(row, col, text, recordHistory, combined);
    if (enabled) {
      invalidateFrom(row);
    }
  };

  // Hook History._delete
  const originalDelete = History._delete.bind(History);
  History._delete = function(row, col, text, recordHistory, combined) {
    originalDelete(row, col, text, recordHistory, combined);
    if (enabled) {
      invalidateFrom(row);
    }
  };

  // Hook Model.text setter for bulk content changes
  const textDescriptor = Object.getOwnPropertyDescriptor(Model, 'text') ||
    { set: function(v) { this._text = v; }, get: function() { return this._text; } };
  const originalTextSetter = textDescriptor.set;

  Object.defineProperty(Model, 'text', {
    set: function(text) {
      originalTextSetter.call(this, text);
      if (enabled) {
        // Full document change - reset cache completely
        stateCache.length = 1;
        stateCache[0] = 0;
      }
    },
    get: textDescriptor.get,
    configurable: true
  });

  // Built-in token types with default colors
  const defaultColors = {
    keyword: '#C678DD',
    string: '#98C379',
    comment: '#5C6370',
    number: '#D19A66',
    operator: '#56B6C2',
    function: '#61AFEF',
    type: '#E5C07B',
    variable: '#E06C75',
    punctuation: '#ABB2BF',
    regex: '#98C379',
    constant: '#D19A66',
    attribute: '#D19A66',
    tag: '#E06C75',
    default: '#ABB2BF'
  };

  let colors = { ...defaultColors };

  /**
   * Language definition format:
   * {
   *   name: 'javascript',
   *   states: {
   *     0: { name: 'normal', rules: [...] },
   *     1: { name: 'string', rules: [...] },
   *     2: { name: 'comment', rules: [...] }
   *   }
   * }
   *
   * Rule format:
   * { pattern: /regex/, token: 'keyword' }              // Simple token
   * { pattern: /regex/, token: 'string', push: 1 }      // Push to state 1
   * { pattern: /regex/, token: 'string', pop: true }    // Pop back to state 0
   * { pattern: /regex/, token: 'comment', next: 2 }     // Switch to state 2
   */

  /**
   * Tokenizes a single line starting from a given state.
   * @param {string} text - Line text to tokenize
   * @param {number} startState - State at start of line
   * @returns {{ tokens: Array, endState: number }}
   */
  function tokenizeLine(text, startState) {
    if (!language) {
      return { tokens: [{ text, type: 'default' }], endState: 0 };
    }

    const tokens = [];
    let pos = 0;
    let state = startState;
    const stateStack = [];

    while (pos < text.length) {
      const stateRules = language.states[state];
      if (!stateRules) {
        // Unknown state, consume rest as default
        tokens.push({ text: text.slice(pos), type: 'default' });
        break;
      }

      let matched = false;

      for (const rule of stateRules.rules) {
        // Create regex that matches at current position
        const regex = new RegExp(rule.pattern.source, 'y');
        regex.lastIndex = pos;
        const match = regex.exec(text);

        if (match) {
          const matchText = match[0];
          if (matchText.length > 0) {
            tokens.push({ text: matchText, type: rule.token || 'default' });
            pos += matchText.length;
          } else {
            // Zero-length match, skip to avoid infinite loop
            pos++;
          }

          // Handle state transitions
          if (rule.push !== undefined) {
            stateStack.push(state);
            state = rule.push;
          } else if (rule.pop) {
            state = stateStack.pop() || 0;
          } else if (rule.next !== undefined) {
            state = rule.next;
          }

          matched = true;
          break;
        }
      }

      if (!matched) {
        // No rule matched - consume one character as default
        tokens.push({ text: text[pos], type: 'default' });
        pos++;
      }
    }

    return { tokens, endState: state };
  }

  /**
   * Ensures state cache is computed up to the given line.
   * @param {number} lineIndex - Line index to compute up to (inclusive)
   */
  function ensureStateCache(lineIndex) {
    if (!language) return;

    // Compute states for any missing lines
    while (stateCache.length <= lineIndex) {
      const prevLine = stateCache.length - 1;
      const prevState = stateCache[prevLine] || 0;
      const { endState } = tokenizeLine(Model.lines[prevLine] || '', prevState);
      stateCache.push(endState);
    }
  }

  /**
   * Invalidates state cache from a given line onwards.
   * Called when text is modified.
   * @param {number} fromLine - First line to invalidate
   */
  function invalidateFrom(fromLine) {
    // Keep cache up to but not including fromLine
    stateCache.length = Math.max(1, fromLine);
  }

  /**
   * Re-tokenizes from invalidation point until states converge.
   * @param {number} fromLine - Line to start re-tokenization
   */
  function revalidate(fromLine) {
    if (!language) return;

    const startLine = Math.max(0, fromLine);
    let state = stateCache[startLine] || 0;

    for (let i = startLine; i < Model.lines.length; i++) {
      const { endState } = tokenizeLine(Model.lines[i], state);

      if (i + 1 < stateCache.length && stateCache[i + 1] === endState) {
        // State converged - no need to continue
        break;
      }

      // Update or extend cache
      if (i + 1 < stateCache.length) {
        stateCache[i + 1] = endState;
      } else {
        stateCache.push(endState);
      }

      state = endState;
    }
  }

  /**
   * Escapes HTML special characters.
   */
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Renders highlighted tokens as HTML.
   * @param {Array} tokens - Array of { text, type }
   * @returns {string} HTML string
   */
  function renderTokens(tokens) {
    return tokens.map(({ text, type }) => {
      const color = colors[type] || colors.default;
      const escaped = escapeHtml(text);
      if (type === 'default') {
        return escaped;
      }
      return `<span style="color:${color}">${escaped}</span>`;
    }).join('');
  }

  /**
   * Highlights all visible lines in the viewport.
   */
  function highlightViewport($container, viewport) {
    if (!enabled || !language) return;

    // Ensure we have state cache up to viewport end
    ensureStateCache(viewport.start + viewport.size);

    for (let i = 0; i < viewport.size; i++) {
      const absLine = viewport.start + i;
      if (absLine >= Model.lines.length) break;

      const lineEl = $container.children[i];
      if (!lineEl) continue;

      const text = Model.lines[absLine] || '';
      const startState = stateCache[absLine] || 0;
      const { tokens } = tokenizeLine(text, startState);

      // Replace textContent with innerHTML
      lineEl.innerHTML = renderTokens(tokens);
    }
  }

  // Register render hook
  renderHooks.onRenderContent.push(highlightViewport);

  // ============================================================================
  // Built-in language definitions
  // ============================================================================

  const languages = {
    javascript: {
      name: 'javascript',
      states: {
        0: {
          name: 'normal',
          rules: [
            // Line comment
            { pattern: /\/\/.*/, token: 'comment' },
            // Block comment start
            { pattern: /\/\*/, token: 'comment', next: 1 },
            // Strings
            { pattern: /"(?:[^"\\]|\\.)*"/, token: 'string' },
            { pattern: /'(?:[^'\\]|\\.)*'/, token: 'string' },
            { pattern: /`(?:[^`\\]|\\.)*`/, token: 'string' },
            // Template literal start (multiline)
            { pattern: /`/, token: 'string', next: 2 },
            // Regex
            { pattern: /\/(?:[^\/\\]|\\.)+\/[gimsuy]*/, token: 'regex' },
            // Numbers
            { pattern: /0[xX][0-9a-fA-F]+/, token: 'number' },
            { pattern: /0[bB][01]+/, token: 'number' },
            { pattern: /0[oO][0-7]+/, token: 'number' },
            { pattern: /\d+\.?\d*(?:[eE][+-]?\d+)?/, token: 'number' },
            // Keywords
            { pattern: /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/, token: 'keyword' },
            // Constants
            { pattern: /\b(?:true|false|null|undefined|NaN|Infinity)\b/, token: 'constant' },
            // Built-in types/objects
            { pattern: /\b(?:Array|Boolean|Date|Error|Function|JSON|Map|Math|Number|Object|Promise|Proxy|Reflect|RegExp|Set|String|Symbol|WeakMap|WeakSet|console|document|window)\b/, token: 'type' },
            // Function calls
            { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/, token: 'function' },
            // Identifiers
            { pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*/, token: 'variable' },
            // Operators
            { pattern: /[+\-*/%=<>!&|^~?:]+/, token: 'operator' },
            // Punctuation
            { pattern: /[{}[\]();,.]/, token: 'punctuation' },
            // Whitespace
            { pattern: /\s+/, token: 'default' }
          ]
        },
        1: {
          name: 'block-comment',
          rules: [
            { pattern: /\*\//, token: 'comment', next: 0 },
            { pattern: /[^*]+/, token: 'comment' },
            { pattern: /\*/, token: 'comment' }
          ]
        },
        2: {
          name: 'template-literal',
          rules: [
            { pattern: /`/, token: 'string', next: 0 },
            { pattern: /\$\{/, token: 'punctuation', push: 3 },
            { pattern: /(?:[^`$\\]|\\.)+/, token: 'string' },
            { pattern: /\$/, token: 'string' }
          ]
        },
        3: {
          name: 'template-expression',
          rules: [
            { pattern: /\}/, token: 'punctuation', pop: true },
            // Include all normal rules for expressions
            { pattern: /"(?:[^"\\]|\\.)*"/, token: 'string' },
            { pattern: /'(?:[^'\\]|\\.)*'/, token: 'string' },
            { pattern: /\d+\.?\d*/, token: 'number' },
            { pattern: /\b(?:true|false|null|undefined)\b/, token: 'constant' },
            { pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*/, token: 'variable' },
            { pattern: /[+\-*/%=<>!&|^~?:]+/, token: 'operator' },
            { pattern: /[{}[\]();,.]/, token: 'punctuation' },
            { pattern: /\s+/, token: 'default' }
          ]
        }
      }
    },

    html: {
      name: 'html',
      states: {
        0: {
          name: 'normal',
          rules: [
            // Comments
            { pattern: /<!--/, token: 'comment', next: 1 },
            // Doctype
            { pattern: /<!DOCTYPE[^>]*>/i, token: 'keyword' },
            // Script tag - switch to JS mode
            { pattern: /<script\b[^>]*>/, token: 'tag', next: 3 },
            // Style tag
            { pattern: /<style\b[^>]*>/, token: 'tag', next: 4 },
            // Closing tags
            { pattern: /<\/[a-zA-Z][a-zA-Z0-9-]*>/, token: 'tag' },
            // Opening tags
            { pattern: /<[a-zA-Z][a-zA-Z0-9-]*/, token: 'tag', next: 2 },
            // Text content
            { pattern: /[^<]+/, token: 'default' }
          ]
        },
        1: {
          name: 'comment',
          rules: [
            { pattern: /-->/, token: 'comment', next: 0 },
            { pattern: /[^-]+/, token: 'comment' },
            { pattern: /-/, token: 'comment' }
          ]
        },
        2: {
          name: 'tag',
          rules: [
            { pattern: /\/>/, token: 'tag', next: 0 },
            { pattern: />/, token: 'tag', next: 0 },
            // Attribute values
            { pattern: /"[^"]*"/, token: 'string' },
            { pattern: /'[^']*'/, token: 'string' },
            // Attribute names
            { pattern: /[a-zA-Z][a-zA-Z0-9-]*/, token: 'attribute' },
            { pattern: /=/, token: 'operator' },
            { pattern: /\s+/, token: 'default' }
          ]
        },
        3: {
          name: 'script',
          rules: [
            { pattern: /<\/script>/, token: 'tag', next: 0 },
            // Simplified JS highlighting within script
            { pattern: /\/\/.*/, token: 'comment' },
            { pattern: /"(?:[^"\\]|\\.)*"/, token: 'string' },
            { pattern: /'(?:[^'\\]|\\.)*'/, token: 'string' },
            { pattern: /\b(?:function|var|let|const|if|else|for|while|return|class|import|export|from|async|await)\b/, token: 'keyword' },
            { pattern: /\b(?:true|false|null|undefined)\b/, token: 'constant' },
            { pattern: /\d+\.?\d*/, token: 'number' },
            { pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*/, token: 'variable' },
            { pattern: /[^<]+/, token: 'default' }
          ]
        },
        4: {
          name: 'style',
          rules: [
            { pattern: /<\/style>/, token: 'tag', next: 0 },
            // Simplified CSS highlighting
            { pattern: /\/\*/, token: 'comment', next: 5 },
            { pattern: /"[^"]*"/, token: 'string' },
            { pattern: /'[^']*'/, token: 'string' },
            { pattern: /#[0-9a-fA-F]{3,8}/, token: 'number' },
            { pattern: /\d+(?:px|em|rem|%|vh|vw)?/, token: 'number' },
            { pattern: /[a-zA-Z-]+(?=\s*:)/, token: 'attribute' },
            { pattern: /[^<]+/, token: 'default' }
          ]
        },
        5: {
          name: 'css-comment',
          rules: [
            { pattern: /\*\//, token: 'comment', next: 4 },
            { pattern: /[^*]+/, token: 'comment' },
            { pattern: /\*/, token: 'comment' }
          ]
        }
      }
    },

    css: {
      name: 'css',
      states: {
        0: {
          name: 'normal',
          rules: [
            // Comments
            { pattern: /\/\*/, token: 'comment', next: 1 },
            // Strings
            { pattern: /"[^"]*"/, token: 'string' },
            { pattern: /'[^']*'/, token: 'string' },
            // Colors
            { pattern: /#[0-9a-fA-F]{3,8}/, token: 'number' },
            // Numbers with units
            { pattern: /\d+\.?\d*(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|rad|turn|s|ms)?/, token: 'number' },
            // At-rules
            { pattern: /@[a-zA-Z-]+/, token: 'keyword' },
            // Pseudo-classes/elements
            { pattern: /::?[a-zA-Z-]+/, token: 'keyword' },
            // Property names (before colon)
            { pattern: /[a-zA-Z-]+(?=\s*:)/, token: 'attribute' },
            // Selectors (class, id, element)
            { pattern: /\.[a-zA-Z_-][a-zA-Z0-9_-]*/, token: 'type' },
            { pattern: /#[a-zA-Z_-][a-zA-Z0-9_-]*/, token: 'variable' },
            { pattern: /[a-zA-Z][a-zA-Z0-9-]*/, token: 'tag' },
            // Functions
            { pattern: /[a-zA-Z-]+(?=\()/, token: 'function' },
            // Punctuation
            { pattern: /[{}();:,]/, token: 'punctuation' },
            // Whitespace
            { pattern: /\s+/, token: 'default' }
          ]
        },
        1: {
          name: 'comment',
          rules: [
            { pattern: /\*\//, token: 'comment', next: 0 },
            { pattern: /[^*]+/, token: 'comment' },
            { pattern: /\*/, token: 'comment' }
          ]
        }
      }
    },

    json: {
      name: 'json',
      states: {
        0: {
          name: 'normal',
          rules: [
            // Strings (keys and values)
            { pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/, token: 'attribute' },
            { pattern: /"(?:[^"\\]|\\.)*"/, token: 'string' },
            // Numbers
            { pattern: /-?\d+\.?\d*(?:[eE][+-]?\d+)?/, token: 'number' },
            // Booleans and null
            { pattern: /\b(?:true|false|null)\b/, token: 'constant' },
            // Punctuation
            { pattern: /[{}[\]:,]/, token: 'punctuation' },
            // Whitespace
            { pattern: /\s+/, token: 'default' }
          ]
        }
      }
    },

    python: {
      name: 'python',
      states: {
        0: {
          name: 'normal',
          rules: [
            // Comments
            { pattern: /#.*/, token: 'comment' },
            // Triple-quoted strings
            { pattern: /"""/, token: 'string', next: 1 },
            { pattern: /'''/, token: 'string', next: 2 },
            // Strings
            { pattern: /f"(?:[^"\\]|\\.)*"/, token: 'string' },
            { pattern: /f'(?:[^'\\]|\\.)*'/, token: 'string' },
            { pattern: /r"[^"]*"/, token: 'string' },
            { pattern: /r'[^']*'/, token: 'string' },
            { pattern: /"(?:[^"\\]|\\.)*"/, token: 'string' },
            { pattern: /'(?:[^'\\]|\\.)*'/, token: 'string' },
            // Numbers
            { pattern: /0[xX][0-9a-fA-F]+/, token: 'number' },
            { pattern: /0[bB][01]+/, token: 'number' },
            { pattern: /0[oO][0-7]+/, token: 'number' },
            { pattern: /\d+\.?\d*(?:[eE][+-]?\d+)?j?/, token: 'number' },
            // Keywords
            { pattern: /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/, token: 'keyword' },
            // Constants
            { pattern: /\b(?:True|False|None)\b/, token: 'constant' },
            // Built-in types
            { pattern: /\b(?:int|float|str|list|dict|set|tuple|bool|bytes|object|type|range|slice|super|property|staticmethod|classmethod)\b/, token: 'type' },
            // Built-in functions
            { pattern: /\b(?:print|len|range|enumerate|zip|map|filter|sorted|reversed|sum|min|max|abs|round|open|input|isinstance|hasattr|getattr|setattr|delattr)\b/, token: 'function' },
            // Decorators
            { pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/, token: 'keyword' },
            // Function definitions
            { pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/, token: 'function' },
            // Identifiers
            { pattern: /[a-zA-Z_][a-zA-Z0-9_]*/, token: 'variable' },
            // Operators
            { pattern: /[+\-*/%=<>!&|^~@]+/, token: 'operator' },
            // Punctuation
            { pattern: /[{}[\]();:,.]/, token: 'punctuation' },
            // Whitespace
            { pattern: /\s+/, token: 'default' }
          ]
        },
        1: {
          name: 'triple-double-string',
          rules: [
            { pattern: /"""/, token: 'string', next: 0 },
            { pattern: /[^"]+/, token: 'string' },
            { pattern: /"/, token: 'string' }
          ]
        },
        2: {
          name: 'triple-single-string',
          rules: [
            { pattern: /'''/, token: 'string', next: 0 },
            { pattern: /[^']+/, token: 'string' },
            { pattern: /'/, token: 'string' }
          ]
        }
      }
    }
  };

  // ============================================================================
  // Public API
  // ============================================================================

  const Syntax = {
    /**
     * Whether syntax highlighting is enabled.
     */
    get enabled() { return enabled; },
    set enabled(value) {
      enabled = !!value;
      if (enabled) {
        invalidateFrom(0);
      }
    },

    /**
     * Sets the language for syntax highlighting.
     * @param {string|Object} lang - Language name or custom language definition
     */
    setLanguage(lang) {
      if (typeof lang === 'string') {
        language = languages[lang] || null;
      } else {
        language = lang;
      }
      invalidateFrom(0);
    },

    /**
     * Gets available built-in language names.
     * @returns {string[]}
     */
    get languages() {
      return Object.keys(languages);
    },

    /**
     * Sets custom colors for token types.
     * @param {Object} customColors - Map of token type to color
     */
    setColors(customColors) {
      colors = { ...defaultColors, ...customColors };
    },

    /**
     * Resets colors to defaults.
     */
    resetColors() {
      colors = { ...defaultColors };
    },

    /**
     * Invalidates the state cache from a line onwards.
     * Call this when text is modified.
     * @param {number} fromLine - First line that changed
     */
    invalidateFrom,

    /**
     * Forces re-tokenization from a line.
     * @param {number} fromLine - Line to start from
     */
    revalidate,

    /**
     * Clears all cached state.
     */
    clearCache() {
      stateCache.length = 1;
      stateCache[0] = 0;
    },

    /**
     * Gets the current state cache (for debugging).
     * @returns {number[]}
     */
    get stateCache() {
      return [...stateCache];
    },

    /**
     * Adds a custom language definition.
     * @param {string} name - Language name
     * @param {Object} definition - Language definition
     */
    addLanguage(name, definition) {
      languages[name] = definition;
    },

    /**
     * Gets token information for a specific line.
     * @param {number} lineIndex - Absolute line index
     * @returns {{ tokens: Array, startState: number, endState: number }}
     */
    getLineTokens(lineIndex) {
      ensureStateCache(lineIndex);
      const startState = stateCache[lineIndex] || 0;
      const { tokens, endState } = tokenizeLine(Model.lines[lineIndex] || '', startState);
      return { tokens, startState, endState };
    },

    /**
     * Tokenizes a single line of text.
     * @param {string} text - Line text to tokenize
     * @param {number} startState - Starting state (0 = normal)
     * @returns {{ tokens: Array, endState: number }}
     */
    tokenizeLine: function(text, startState) {
      return tokenizeLine(text, startState);
    },

    /**
     * Ensures state cache is populated up to a given line.
     * @param {number} lineIndex - Line index to populate up to
     */
    ensureStateCache: function(lineIndex) {
      return ensureStateCache(lineIndex);
    }
  };

  // Attach to vbuf instance
  vbuf.Syntax = Syntax;

  return Syntax;
}
