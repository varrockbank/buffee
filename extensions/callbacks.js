/**
 * Creates status line callbacks for a Buffee editor.
 * @param {HTMLElement} node - The editor container element
 * @returns {Object} Callbacks object to pass to Buffee config
 */
function BuffeeStatusLine(node) {
  const $headRow = node.querySelector('.wb-head-row');
  const $headCol = node.querySelector('.wb-head-col');
  const $lineCounter = node.querySelector('.wb-linecount');

  return {
    _headRow: $headRow ? (frame => $headRow.innerHTML = frame.row + 1) : null,
    _headCol: $headCol ? (frame => $headCol.innerHTML = frame.col + 1) : null,
    _lc: $lineCounter ? ((frame, buffee) => {
      $lineCounter.textContent = `${frame.lineCount.toLocaleString()}L, originally: ${buffee.Model.originalLineCount}L ${buffee.Model.byteCount} bytes`;
    }) : null
  };
}