function WarrenBuffer(id) {
  this._elEditor = document.createElement("div");
  this._elEditor.setAttribute("class", "editor");

  this._elLineCount = document.createElement("div");
  const elStatusLine = document.createElement("div");
  elStatusLine.appendChild(this._elLineCount);

  const elWrapper = document.getElementById(id);
  elWrapper.appendChild(elStatusLine);
  elWrapper.appendChild(this._elEditor);

  self = this;

  const Viewport = {
    start: 0,
    size: 10,
    // @param i, amount to scroll viewport by.
    scroll(i) {
      this.start += i;
      this.start = $clamp(this.start, 0, this._lc - 1);
      render();
    },
    set(start, size) {
      this.start = $clamp(start, 0, this._lc - 1);
      this.size = size;
      render();
    },
  };

  function render() {
    self._elLineCount.innerHTML = `Line Count: ${self._lc}`;
    // Begin render editor
    self._elEditor.innerHTML = null;

    const viewportLines = self._lines.slice(
      Viewport.start,
      Viewport.start + Viewport.size
    );

    // Render viewport lines;
    for (let i = 0; i < viewportLines.length; i++) {
      const lineContents = viewportLines[i];

      const elLineDiv = document.createElement("div");
      elLineDiv.appendChild(document.createTextNode(lineContents));
      // Prevent empty-line from having zero height
      elLineDiv.style.lineHeight = '1.2em';
      elLineDiv.style.minHeight = '1.2em';

      // TODO: faster if we append to a fragment then render in a single go
      self._elEditor.appendChild(elLineDiv);
    }
    // End render editor

    return this;
  }
  this.Viewport = Viewport;
  this.render = render;

  this.setText("");
}

WarrenBuffer.prototype.setText = function (text) {
  this._lines = text.split("\n");
  this._lc = this._lines.length;
  this.Viewport.start = 0;
  this.Viewport.size = 10;
  return this.render();
};

/**
 *
 * @param i line number
 * @param lines
 */
WarrenBuffer.prototype.splice = function (i, lines) {
  this._lines.splice(i - 1, 0, ...lines);
  this._lc = this._lines.length;
  this.render();
};

function $clamp(value, min, max) {
  if (value < min) {
    console.warn("Out of bounds");
    return min;
  }
  if (value > max) {
    console.warn("Out of bounds");
    return max;
  }
  return value;
}