function WarrenBuffer(node,
    treeSitterParser = null,
    treeSitterQuery = null,
    lineHeight = 24,
    initialViewportSize = 20,
    editorPaddingPX = 4 ,
    indentation = 2,
    colorPrimary = "#B2B2B2",
    colorSecondary = "#212026") {
  const $e = node.querySelector('.wb .wb-lines');
  $e.style.lineHeight = `${lineHeight}px`;
  $e.style.fontSize = `${lineHeight}px`;
  // forces the selections to be relative to this rather than the parent container
  $e.style.position = "relative";
  $e.style.margin = `${editorPaddingPX}px`;

  const $status = node.querySelector('.wb .wb-status');
  $status.style.padding = "6px";
  $status.style.background = colorSecondary;
  $status.style.color = colorPrimary;
  const $statusLineCoord = node.querySelector('.wb .wb-coordinate');
  const $lineCounter = node.querySelector('.wb .wb-linecount');
  const $indentation = node.querySelector('.wb .wb-indentation');

  // TOOD: make this width based on number of digits of line
  const $gutter = Object.assign(node.querySelector('.wb .wb-gutter'), {
    style: `
            font-size: ${lineHeight}px;
            line-height: ${lineHeight}px;
            text-align: right;
            padding-top: ${editorPaddingPX}px;
            padding-right: ${editorPaddingPX * 2}px;
            background-color: ${colorSecondary};
            color: ${colorPrimary};
            width: ${3}ch;
          `
  });

  const $selections = [];   // We place an invisible selection on each viewport line. We only display the active selection.
  const fragmentLines = document.createDocumentFragment();
  const fragmentSelections = document.createDocumentFragment();
  const fragmentGutters = document.createDocumentFragment();

  const detachedTail = { row : 0, col : 2};
  // In case where we have cursor, we want tail === head.
  let tail = head = { row: 0, col: 2 };
  let maxCol = tail.col;
  const Selection = {
    get ordered() { return this.isForwardSelection ? [head, tail] : [tail, head] },
    moveRow(value) {
      if (value > 0) {
        if (tail.row < (Viewport.end - Viewport.start)) {                      // Inner line, Move down
          tail.row ++;
          if(Viewport.lines[tail.row].length >= tail.col) {
            tail.col = Math.min(maxCol, Math.max(0, Viewport.lines[tail.row].length-1));
          } else {
            tail.col = Math.min(tail.col, Math.max(0, Viewport.lines[tail.row].length-1));
          }
        } else {                                                                // Last line of viewport, scroll viewport down
          if (Viewport.end !== Model.lastIndex) {
            Viewport.scroll(1);
            tail.col = Math.min(tail.col, Math.max(0, Viewport.lines[tail.row].length - 1));
          } else { }                                                             // Last line of file, No-Op.
        }
      } else {
        if (tail.row === 0) {                                                    // First line of viewport, scroll viewport up
          Viewport.scroll(-1);
          tail.col = Math.min(tail.col, Math.max(0, Viewport.lines[tail.row].length - 1 ));
        } else {                                                                 // Inner line, move up.
          tail.row--;
          if(Viewport.lines[tail.row].length >= tail.col) {
            tail.col = Math.min(maxCol, Math.max(0, Viewport.lines[tail.row].length-1));
          } else {
            tail.col = Math.min(tail.col, Math.max(0, Viewport.lines[tail.row].length-1));
          }

          tail.col = Math.min(tail.col, Math.max(0, Viewport.lines[tail.row].length - 1));
        }
      }
      render(true);
    },
    moveCol(value) {
      if (value === 1) {
        if (tail.col + 1 < Viewport.lines[tail.row].length) {    // Move right 1 character.
          maxCol = ++tail.col;
        } else {
          if (tail.row < (Viewport.end - Viewport.start)) {     // Move to beginning of next line.
            maxCol = tail.col = 0;
            tail.row++;
          } else {
            if (Viewport.end < Model.lastIndex) {               // Scroll from last line.
              tail.col = 0;
              Viewport.scroll(1);
            } else {}                                         // End of file
          }
        }
      } else if (value === -1) {
        if (tail.col > 0) {                                   // Move left 1 character.
          maxCol = --tail.col;
        } else {
          if (tail.row > 0) {                                 // Move to end of previous line
            tail.row--;
            maxCol = tail.col = Math.max(0, Viewport.lines[tail.row].length - 1);
          } else {
            if (Viewport.start !== 0) {                       // Scroll then move tail to end of new current line.
              Viewport.scroll(-1);
              tail.col = Math.max(0, Viewport.lines[tail.row].length - 1);
            } else {}
          }
        }
      } else {
        console.warning(`Do not support moving by multiple values (${value}) yet `);
      }
      render();
    },
    get isSelection() {
      return tail !== head
    },
    // Assumes we are in selection
    get isForwardSelection() {
      return head.row == tail.row && head.col < tail.col || head.row < tail.row;
    },
    setCursor({row, col}) {
      tail.row = row;
      tail.col = col;
      this.makeCursor();
    },
    makeCursor() {
      head.row = tail.row;
      head.col = tail.col;
      tail = head;
    },
    makeSelection() {
      tail = detachedTail;
      tail.row = head.row;
      tail.col = head.col;
    },
    insert(c) {
      if (this.isSelection) {
        // Sort head and tail by order of appearance ( depends on chirality )
        const [first, second] = this.ordered;
        const { index, left } = this.partitionLine(first);
        const p = this.partitionLine({ row: second.row, col: second.col + 1 });
        const {right} = p;
        Model.splice(index, [left + c + right], second.row - first.row + 1);

        tail.row = first.row;
        tail.col = first.col;
        this.makeCursor();
      } else {
        const { index, left, right } = this.partitionLine(head);
        Model.lines[index] = left + c + right;
        tail.col += c.length;
      }
      render(true);
    },
    delete() {
      // TODO: Possibly, insert can be defined in terms of delete.
      if (this.isSelection) {
        return this.insert('');
      }

      const { index, left, right } = this.partitionLine(head);
      if (head.col > 0) {
        Model.lines[index] = left.slice(0, left.length - 1) + right;
        tail.col--;
      } else if (head.row > 0) {
        tail.col = Model.lines[index - 1].length;
        tail.row--;
        Model.lines[index - 1] += Model.lines[index];
        Model.delete(index);
      }
      render(true);
    },
    newLine() {
      // TODO: handle redundant rendering
      if (this.isSelection) Selection.insert('');

      const { index, left, right } = this.partitionLine(head);
      Model.lines[index] = left;
      Model.splice(index + 1, [right]);
      tail.col = 0;
      if (head.row < Viewport.size - 1) {
        tail.row++;
      } else {
        Viewport.scroll(1);
      }
      render(true);
    },
    indent() {
      if(!this.isSelection) return;
      const [first, second] = this.ordered;

      for(let i = first.row; i <= second.row; i++) {
          const realRow = Viewport.start + i;
          console.log("Before: " + Model.lines[realRow]);
          Model.lines[realRow] = " ".repeat(indentation) + Model.lines[realRow];
          console.log("After: " + Model.lines[realRow]);
      }
      first.col += indentation;
      second.col += indentation;

      render(true);
    },
    unindent() {
       if(!this.isSelection) return;
      // Note: Vim, VSCode, Intellij all has slightly different unindent behavior.
      // VSCode: for lines not aligned at a multiple of indentation number of spaces, align them to the
      // first such position.
      // vim: removes the selection, although it does keep a hidden memory of the most recent indentation operation which you can repeat.
      // intellij: move all selected lines by indentation of number spaces, unless there is not enough to unindent
      // Currently we follow intellij implementation but perhaps VSCode's is the best.
      const [first, second] = this.ordered;

      for(let i = first.row; i <= second.row; i++) {
        const realRow = Viewport.start + i;
        const line = Model.lines[realRow];
        let maxUnindent = 0;
        for(let i = 0; i < Math.min(indentation, line.length); i++) {
          if(line.charAt(0) === " ") {
            maxUnindent++;
          } else {
            break;
          }
        }
        Model.lines[realRow] = line.slice(maxUnindent);
        if(i == first.row) {
          first.col -= maxUnindent;
        } else if ( i == second.row) {
          second.col -= maxUnindent;
        }

        render(true);
      }
    },
    // Utility to extract the text left, right, and character at the col of the
    // position for the row of the position.
    partitionLine({ row, col }) {
      const index = Viewport.start + row;
      const line = Model.lines[index];
      return {
        index,
        left: line.slice(0, col),
        right: line.slice(col)
      }
    }
  };

  const Model = {
    lines: [],
    byteCount: "",
    originalLineCount: 0,
    treeSitterTree: null,
    treeSitterCaptures: [],
    get lastIndex() { return this.lines.length - 1 },
    set text(text) {
      this.lines = text.split("\n");
      this.byteCount = new TextEncoder().encode(text).length
      this.originalLineCount = this.lines.length;
      if(treeSitterParser && treeSitterQuery) {
        this.treeSitterTree = treeSitterParser.parse(text);
        this.treeSitterCaptures = treeSitterQuery.captures(this.treeSitterTree.rootNode);
        // for (const { name, node } of this.treeSitterCaptures) {
        //   console.log(name, node.text); // e.g. "function greet"
        //   console.log(node);
        // }
      }

      render(true);
    },
    splice(i, lines, n = 0) {
      this.lines.splice(i , n, ...lines);
      render();
    },
    delete(i) {
      this.lines.splice(i, 1);
    },
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
          className: "wb-selection",
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
      $lineCounter.textContent = `${lastRender.lineCount = Model.lastIndex + 1}L, originally: ${Model.originalLineCount}L ${Model.byteCount} bytes`;
    }

    const digitsInLargestLineNumber = Viewport.end.toString().length;
    if(digitsInLargestLineNumber > 2 ) {
      $gutter.style.width = `${ digitsInLargestLineNumber +  1 }ch`;
    }

    $gutter.textContent = null;
    for (let i = 0; i < Viewport.size; i++) {
      const div = document.createElement("div")
      div.textContent = Viewport.start + i + 1;
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

    if(Model.treeSitterCaptures) {
      // The point of tree sitter is to incremental restructuring of the tree.
      // That is, each text editor operation changes the underlying positions and therefore
      // the tree needs to be revised. the simplest revision is updating index. the harder revisions
      // is the addition and removal of nodes. at any rate, each text editor operation would need to be
      // coupled to changes in treesitter tree. here, we are lazy and reparse the tree everytime

      const text = Model.lines.join("\n")
      Model.treeSitterTree = treeSitterParser.parse(text);
      Model.treeSitterCaptures = treeSitterQuery.captures(Model.treeSitterTree.rootNode);

      let minJ = 0;
      for(let i = 0; i < Viewport.size; i++) {
        $e.children[i].innerHTML = "";
        $e.children[i].textContent = Viewport.lines[i] || null;
        // TODO: terribly inefficient loop. Just grab the elements that are relevant
        for(let j = minJ; j < Model.treeSitterCaptures.length; j++) {
          const capture = Model.treeSitterCaptures[j]
          const startPosition = capture.node.startPosition;
          if(startPosition.row === Viewport.start + i) {
            const startCol = startPosition.column;
            const endCol = startCol + capture.node.text.length;

            const line = $e.children[i].textContent;
            const left = line.slice(0, startCol);
            const right = line.slice(endCol);

            // console.log("original string: ", line);
            // console.log("  left: ", left);
            // console.log("  right: ", right);
            // console.log("  startPostion:", startPosition);
            // console.log("  endCol:", endCol);

            // TODO: be careful if this is HTML, it is escaped.
            if (capture.name === "function") {
              if(left.length > 8) {
                const leftA = left.slice(0, left.length - 9);
                const leftB = left.slice(left.length - 9);
                $e.children[i].innerHTML = `${leftA}<span class="highlight-function">${leftB}</span><span class="highlight-function-name">${capture.node.text}</span>${right}`;
              }
            } else if (capture.name === "string") {
              $e.children[i].innerHTML = `${left}<span class="highlight-string">${capture.node.text}</span>${right}`;
            }
            // console.log("after: ", $e.children[i].textContent);

            minJ = j;
            break;
          }
        }
      }
    }

    // * BEGIN render selection
    // Hide all selections
    for (let i = 0; i < $selections.length; i++) {
      $selections[i].style.visibility = 'hidden';
    }
    const [firstEdge, secondEdge] = Selection.ordered;

    // Render selection lines. Behavior is consistent with vim/vscode but not Intellij.
    for (let i = firstEdge.row + 1; i <= secondEdge.row - 1; i++) {
      $selections[i].style.visibility = 'visible';
      $selections[i].style.left = 0;
      if (i < Viewport.lines.length) { // TODO: this can be removed if selection is constrained to source content
        const content = Viewport.lines[i];
        if(content.length > 0 ) {
          $selections[i].style.width = `${content.length}ch`;
        } else {
          // For empty line, we still render 1 character selection
          $selections[i].style.width = `1ch`;
        }
      }
    }

    // Render the leading and tailing selection line
    $selections[firstEdge.row].style.left = `${firstEdge.col}ch`;
    if (secondEdge.row === firstEdge.row) {
      $selections[firstEdge.row].style.width = `${secondEdge.col - firstEdge.col + 1 }ch`;
      $selections[firstEdge.row].style.visibility = 'visible';
    } else {
      if(firstEdge.row < Viewport.lines.length) { // TODO: this can be removed if selection is constrained to source content
        const text = Viewport.lines[firstEdge.row];

        $selections[firstEdge.row].style.width = `${text.length - firstEdge.col}ch`;
        $selections[firstEdge.row].style.visibility = 'visible';
      }
      if(secondEdge.row < Viewport.lines.length) {
        const text = Viewport.lines[secondEdge.row];
        if(secondEdge.col >= text.length) {
          console.warn(`secondEdge's column ${secondEdge.col} is too far beyond the text with length: `, text.length);
        }
        $selections[secondEdge.row].style.width = `${Math.min(secondEdge.col + 1, text.length)}ch`;
        $selections[secondEdge.row].style.visibility = 'visible';
      }
    }
    // * END render selection

    // TODO: this is infrequently changed. Render it ad-hoc in the mutator method.
    $indentation.innerHTML = `Spaces: ${indentation}`;

    $statusLineCoord.innerHTML = `Ln ${Viewport.start + tail.row + 1 }, Col ${tail.col + 1 }`;

    return this;
  }
  this.Viewport = Viewport;
  this.Model = Model;
  this.Selection = Selection;

  render(true);

  // Bind keyboard control to move viewport
  node.addEventListener('keydown', event => {
    event.preventDefault();

    if(event.key.startsWith("Arrow")) {
      if (!event.shiftKey && Selection.isSelection) {
        if(event.key === "ArrowLeft") {
          Selection.setCursor(Selection.ordered[0]); // Move cursor to the first edge
          render(true);
        } else if (event.key === "ArrowRight") {
          Selection.setCursor(Selection.ordered[1]); // Move cursor to the second edge
          render(true);
        } else if (event.key === "ArrowUp") {
          // TODO: bug when selection coincides will scrolling the viewport
          Selection.setCursor(Selection.ordered[0]);
          Selection.moveRow(-1);
        } else if (event.key === "ArrowDown") {
          // TODO: bug when selection coincides will scrolling the viewport
          Selection.setCursor(Selection.ordered[1]);
          Selection.moveRow(1);
        }
      } else {
        if (event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if (event.key === "ArrowDown") {
          Selection.moveRow(1);
        } else if (event.key === "ArrowUp") {
          Selection.moveRow(-1);
        } else if (event.key === "ArrowLeft") {
          Selection.moveCol(-1);
        } else if (event.key === "ArrowRight") {
          Selection.moveCol(1);
        }
      }
    } else if (event.metaKey) {
    } else if (event.key === "Backspace") {
      Selection.delete();
    } else if (event.key === "Enter") {
      Selection.newLine();
    } else if (event.key === "Escape") {
    } else if (event.key === "Tab" ) {
      if(Selection.isSelection) {
        if(event.shiftKey) {
          console.log("here");
          Selection.unindent();
        } else {
          Selection.indent();
        }
      } else {
        Selection.insert(" ".repeat(indentation));
      }
    } else if (event.key.length > 1) {
      console.warn('Ignoring unknown key: ', event.code, key);
    } else if (event.key === "Shift") {
    } else {
      Selection.insert(event.key);
    }
  });
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