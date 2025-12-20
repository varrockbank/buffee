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
    _headRow: $headRow ? (row => $headRow.innerHTML = row + 1) : null,
    _headCol: $headCol ? (col => $headCol.innerHTML = col + 1) : null,
    _lc: $lineCounter ? ((lineCount, buffee) => {
      $lineCounter.textContent = `${lineCount.toLocaleString()}L, originally: ${buffee.Model.originalLineCount}L ${buffee.Model.byteCount} bytes`;
    }) : null
  };
}