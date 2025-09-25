function WarrenBuffer(node, lineHeight = 24, initialViewportSize = 20) {
  const $e = node.querySelector('.🌮');
  $e.style.lineHeight = `${lineHeight}px`;
  $e.style.fontSize = `${lineHeight}px`;
  const $lc = node.querySelector('.🧛');
  const $container = node.querySelector('.🦄');
  const $selections = [];   // We place an invisible selection on each viewport line. We only display the active selection.
  const fragmentLines = document.createDocumentFragment();
  const fragmentSelections = document.createDocumentFragment();

  const Selection = {
    tail: { row: 1, col: 5 },
    head: { row: 1, col: 3 },
    get edges() { return [this.head, this.tail] },

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

  function populateSelections() {
    for (let i = 0; i < Viewport.size; i++) {
      $selections[i] = fragmentSelections.appendChild(
        Object.assign(document.createElement("div"), {
          className: "🧹",
          style: `
            display: block;
            visibility: hidden;
            width: 1ch;
            height: ${lineHeight}px;
            font-size: ${lineHeight}px;
          `
        })
      );
    }
    $container.appendChild(fragmentSelections);
  }
  function render(renderLineContainers = false) {
    if (lastRender.lineCount !== Model.lastIndex + 1 ) {
      $lc.textContent = lastRender.lineCount = Model.lastIndex + 1;
    }

    // Renders the containers for the viewport lines, as well as selections
    // TODO: can be made more efficient by only removing delta of selections
    if(renderLineContainers) {
      $e.textContent = null;
      for (let i = 0; i < Viewport.size; i++)
        fragmentLines.appendChild(document.createElement("pre"));
      $e.appendChild(fragmentLines);

      // Remove all the selections
      while($selections.length > 0) $selections.pop().remove();
      populateSelections();
    }

    // Update contents of line containers
    for(let i = 0; i < Viewport.size; i++)
      $e.children[i].textContent = Viewport.lines[i] || null;

    // * BEGIN render selection
    // Clear all selections
    for (let i = 0; i < $selections.length; i++)
      $selections[i].style.visibility = 'hidden';

    const [firstEdge, secondEdge] = Selection.edges;
    // Configure the two new edges.
    $selections[firstEdge.row-1].style.left = `${firstEdge.col - 1}ch`;
    if (secondEdge.row === firstEdge.row) {
      $selections[firstEdge.row-1].style.width = `${secondEdge.col - firstEdge.col + 1}ch`;
      $selections[firstEdge.row-1].style.visibility = 'visible';
    } else {
      alert("doesn't support multiline selection yet")
    }
    // * END render selection

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