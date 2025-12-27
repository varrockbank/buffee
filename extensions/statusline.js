/**
 * Decorator: adds status line updates to a Buffee instance.
 * Updates status elements on each render when values change.
 *
 * @param {Buffee} editor - The Buffee instance to extend
 * @returns {Buffee} The extended editor instance
 */
function BuffeeStatusLine(editor) {
  const { renderHooks, $e } = editor._;
  const { Model, Mode } = editor;
  const $parent = $e.parentElement;

  const $headRow = $parent.querySelector('.buffee-head-row');
  const $headCol = $parent.querySelector('.buffee-head-col');
  const $lineCounter = $parent.querySelector('.buffee-linecount');
  const $spaces = $parent.querySelector('.buffee-spaces');

  let lastRow = -1, lastCol = -1, lastLineCount = -1, lastSpaces = -1;

  renderHooks.push(() => {
    const { row, col } = editor._.head;
    const lineCount = Model.lastIndex + 1;

    if ($headRow && row !== lastRow) {
      $headRow.textContent = row + 1;
      lastRow = row;
    }
    if ($headCol && col !== lastCol) {
      $headCol.textContent = col + 1;
      lastCol = col;
    }
    if ($lineCounter && lineCount !== lastLineCount) {
      $lineCounter.textContent = `${lineCount.toLocaleString()}L, originally: ${Model.originalLineCount}L ${Model.byteCount} bytes`;
      lastLineCount = lineCount;
    }
    if ($spaces && Mode.spaces !== lastSpaces) {
      $spaces.textContent = `Spaces: ${Mode.spaces}`;
      lastSpaces = Mode.spaces;
    }
  });

  return editor;
}
