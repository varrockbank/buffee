/**
 * @fileoverview Buffee[Name] - [Description]
 * @version 1.0.0
 */

/**
 * Decorator: adds [feature] to a Buffee instance.
 *
 * @param {Buffee} editor - The Buffee instance to extend
 * @returns {Buffee} The extended editor instance
 * @example
 * const editor = Buffee__NAME__(Buffee(container, config));
 */
function Buffee__NAME__(editor) {
  // === INTERNALS (via editor._) ===
  // Available: $e, $l, $textLayer, render, renderHooks, contentOffset, appendLines, insert, delete
  const { $e, render, renderHooks } = editor._;

  // === EDITOR PROPERTIES ===
  // Available: Model, Selection, Viewport, Mode, lineHeight
  const { Model, Viewport, lineHeight } = editor;

  // === STATE ===
  let enabled = false;

  // === RENDER HOOK (optional) ===
  // Called after each render cycle. Args: ($container, viewport, rebuilt)
  renderHooks.push(($container, viewport, rebuilt) => {
    if (!enabled) return;
    // Update DOM based on new viewport state
    // rebuilt is non-zero when container was rebuilt (viewport size changed)
  });

  // === API ===
  const __NAME__ = {
    get enabled() { return enabled; },
    set enabled(v) {
      enabled = v;
      render(true);
    },

    // Add methods here
  };

  // === ATTACH TO EDITOR ===
  editor.__NAME__ = __NAME__;
  return editor;
}

// Usage (decorator pattern):
// const editor = Buffee__NAME__(Buffee(container, config));
// editor.__NAME__.enabled = true;
//
// Multiple extensions:
// const editor = BuffeeB(BuffeeA(Buffee(container, config)));
