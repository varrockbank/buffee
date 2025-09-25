function WarrenBuffer(node, lineHeight = 24, initialViewportSize = 20) {
  const $e = node.querySelector('.🦄 .🌮');
  $e.style.lineHeight = `${lineHeight}px`;
  $e.style.fontSize = `${lineHeight}px`;
  const $lineCounter = node.querySelector('.🦄 .🧛');

  // TOOD: make this width based on number of digits of line
  const $gutter = Object.assign(node.querySelector('.🦄 .gutter'), {
    style: `
            font-size: ${lineHeight}px;
            line-height: ${lineHeight}px;
            text-align: right;
            padding-right: 8px;
            background-color: black;
            color: white;
            width: ${3}ch;
          `
  });

  const $selections = [];   // We place an invisible selection on each viewport line. We only display the active selection.
  const fragmentLines = document.createDocumentFragment();
  const fragmentSelections = document.createDocumentFragment();
  const fragmentGutters = document.createDocumentFragment();

  const Selection = {
    head: { row: 1, col: 3 },
    tail: { row: 6, col: 12 },
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
            top: ${i * lineHeight}px;
          `
        })
      );
    }
    $e.appendChild(fragmentSelections);
  }
  function render(renderLineContainers = false) {
    if (lastRender.lineCount !== Model.lastIndex + 1 ) {
      $lineCounter.textContent = lastRender.lineCount = Model.lastIndex + 1;
    }

    $gutter.textContent = null;
    for (let i = 0; i < Viewport.size; i++) {
      const div = document.createElement("div")
      div.textContent = i + 1;
      fragmentGutters.appendChild(div);
    }

    $gutter.appendChild(fragmentGutters);

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
    // Hide all selections
    for (let i = 0; i < $selections.length; i++) {
      $selections[i].style.visibility = 'hidden';
    }
    const [firstEdge, secondEdge] = Selection.edges;

    // Render selection lines lines. Behavior is consistent with vim/vscode but not Intellij.
    for (let i = firstEdge.row + 1; i <= secondEdge.row - 1; i++) {
      $selections[i - 1].style.visibility = 'visible';
      $selections[i - 1].style.left = 0;
      if (i - 1 < Viewport.lines.length) { // TODO: this can be removed if selection is constrained to source content
        const content = Viewport.lines[i-1];
        console.log(i + " , " + content + ", with length: " + content.length);
        if(content.length > 0 ) {
          $selections[i - 1].style.width = `${content.length}ch`;
        } else {
          // For empty line, we still render 1 character selection
          $selections[i - 1].style.width = `1ch`;
        }
      }
    }

    // Render the leading and tailing selection line
    $selections[firstEdge.row-1].style.left = `${firstEdge.col - 1}ch`;
    if (secondEdge.row === firstEdge.row) {
      $selections[firstEdge.row-1].style.width = `${secondEdge.col - firstEdge.col + 1}ch`;
      $selections[firstEdge.row-1].style.visibility = 'visible';
    } else {
      if(firstEdge.row <= Viewport.lines.length) { // TODO: this can be removed if selection is constrained to source content
        const text = Viewport.lines[firstEdge.row-1];

        $selections[firstEdge.row - 1].style.width = `${text.length - firstEdge.col + 1}ch`;
        $selections[firstEdge.row - 1].style.visibility = 'visible';

        $selections[secondEdge.row - 1 ].style.width = `${secondEdge.col}ch`;
        $selections[secondEdge.row - 1].style.visibility = 'visible';
      }
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