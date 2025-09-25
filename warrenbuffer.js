function WarrenBuffer(node, lineHeight = 24, initialViewportSize = 20) {
  const $e = node.querySelector('.🌮');
  $e.style.lineHeight = `${lineHeight}px`;
  $e.style.fontSize = `${lineHeight}px`;
  const $lc = node.querySelector('.🧛');
  const $container = node.querySelector('.🦄');
  const $cursors = [];   // We place an invisible cursor on each viewport line. We only display the active cursors.
  const fragmentLines = document.createDocumentFragment();
  const fragmentSelections = document.createDocumentFragment();

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
      if(this.size !== size) {
        this.size = size;
        render(true );
      } else {
        render();
      }
    },
    get lines() {
      return Model.lines.slice(this.start, this.end + 1);
    },
  };

  const lastRender = {
    lineCount: -1
  };

  function populateCursors() {
    for (let i = 0; i < Viewport.size; i++) {
      const div = $cursors[i] = document.createElement('div');
      div.style.display = 'block';
      div.style.visibility = 'hidden';
      div.style.width = `1ch`;
      div.style.height = div.style.fontSize = `${lineHeight}px`;
      div.classList.add('🧹');
      fragmentSelections.appendChild(div);
    }
    $container.appendChild(fragmentSelections);
  }
  function render(renderLineContainers = false) {
    if (lastRender.lineCount !== Model.lastIndex + 1 ) {
      $lc.textContent = lastRender.lineCount = Model.lastIndex + 1;
    }

    // Renders the containers for the viewport lines, as well as cursors
    // TODO: can be made more efficient by only removing delta of cursors
    if(renderLineContainers) {
      $e.textContent = null;
      for (let i = 0; i < Viewport.size; i++)
        fragmentLines.appendChild(document.createElement("pre"));
      $e.appendChild(fragmentLines);

      // Remove all the cursors
      while($cursors.length > 0) $cursors.pop().remove();
      populateCursors();
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