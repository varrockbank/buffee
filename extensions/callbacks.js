/**
 * Creates status line callbacks for a Buffee editor.
 * @param {HTMLElement} node - The editor container element
 * @returns {Object} Callbacks object to pass to Buffee config
 */
function BuffeeStatusLine(node) {
  const $headRow = node.querySelector('.wb-head-row');
  const $headCol = node.querySelector('.wb-head-col');
  const $lineCounter = node.querySelector('.wb-linecount');
  const $indentation = node.querySelector('.wb-indentation');

  const callbacks = {};
  if ($headRow) callbacks.row = frame => $headRow.innerHTML = frame.row + 1;
  if ($headCol) callbacks.col = frame => $headCol.innerHTML = frame.col + 1;
  if ($lineCounter) callbacks.lineCount = (frame, buffee) => {
    $lineCounter.textContent = `${frame.lineCount.toLocaleString()}L, originally: ${buffee.Model.originalLineCount}L ${buffee.Model.byteCount} bytes`;
  };
  if ($indentation) callbacks.indentation = frame => $indentation.innerHTML = `Spaces: ${frame.indentation}`;
  return callbacks;
}