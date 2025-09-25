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

  const Model = {
    lines: [],
    lc: 0,
    set text(text) {
      this.lines = text.split("\n");
      this.lc = this.lines.length;
      render();
    },
    splice(i, lines) {
      this.lines.splice(i - 1, 0, ...lines);
      this.lc = this.lines.length;
      render();
    }
  }
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
    self._elLineCount.innerHTML = `Line Count: ${Model.lc}`;
    // Begin render editor
    self._elEditor.innerHTML = null;

    const viewportLines = Model.lines.slice(
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
  this.Model = Model;

  render();
}

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