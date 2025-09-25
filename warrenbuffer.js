function WarrenBuffer(node, lineHeight = 24, initialViewportSize = 20) {
  const $e = node.querySelector('.🌮');
  $e.style.lineHeight = `${lineHeight}px`;
  const $lc = node.querySelector('.🧛');
  const $container = node.querySelector('.🦄');
  $e.style.fontSize = `${lineHeight}px`;

  // TODO: use initialLines to specify number of initial line fragments
  const fragmentLines = document.createDocumentFragment();

  const fragmentSelections = document.createDocumentFragment();
  // We place an invisible cursor on each viewport line. We only display the active cursors.
  const $cursors = [];
  // TODO: we don't garbage collect "excess" cursors
  addNewCursors(initialViewportSize);
  function addNewCursors(quantity) {
    const start = $cursors.length;
    for (let i = 0; i < quantity; i++) {
      const div = $cursors[start + i] = document.createElement('div');
      div.style.display = 'block';
      div.style.visibility = 'hidden';
      div.style.width = `1ch`;
      div.style.height = div.style.fontSize = `${lineHeight}px`;
      div.classList.add('🧹');
      fragmentSelections.appendChild(div);
    }
    $container.appendChild(fragmentSelections);
  }

  const Cursor = {
    row: 1,
    col: 3,
  };

  const Model = {
    lines: [],
    get lastIndex() { return this.lines.length - 1 },
    set text(text) {
      this.lines = text.split("\n");
      render(true);
    },
    splice(i, lines) {
      this.lines.splice(i - 1, 0, ...lines);
      render();
    }
  }
  const Viewport = {
    start: 0,
    size: initialViewportSize,
    get end() {
      return Math.min(this.start + this.size - 1, Model.lastIndex);
    },
    // @param i, amount to scroll viewport by.
    scroll(i) {
      this.start += i;
      this.start = $clamp(this.start, 0, Model.lastIndex);
      render();
    },
    set(start, size) {
      this.start = $clamp(start, 0, Model.lastIndex);
      this.size = size;
      // TODO: there is a bug if change from 20 to 15 viewport. 5 dont get updated
      // Perhaps need to call render(true);
      render();
    },
    get lines() {
      return Model.lines.slice(this.start, this.end + 1);
    },
  };

  const lastRender = {
    lineCount: -1
  };
  function render(renderLineContainers = false) {
    if (lastRender.lineCount !== Model.lastIndex + 1 ) {
      $lc.textContent = lastRender.lineCount = Model.lastIndex + 1;
    }

    // Renders the containers for the viewport lines
    if(renderLineContainers) {
      $e.textContent = null;
      for (let i = 0; i < Viewport.size; i++)
        fragmentLines.appendChild(document.createElement("pre"));
      $e.appendChild(fragmentLines);
    }
    // Update contents of line containers
    for(let i = 0; i < Viewport.size; i++)
      $e.children[i].textContent = Viewport.lines[i] || null;

    // * BEGIN render cursor
    // Clear all cursors
    for (let i = 0; i < $cursors.length; i++)
      $cursors[i].style.visibility = 'hidden';
    // Activate the current cursor
    $cursors[Cursor.row-1].style.left = `${Cursor.col-1}ch`;
    $cursors[Cursor.row-1].style.visibility = 'visible';
    // * END render cursor

    return this;
  }
  this.Viewport = Viewport;
  this.Model = Model;

  render(true);
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