function WarrenBuf(node, config = {}) {
  this.version = "4.1.0-alpha.1";

  // Extract configuration with defaults
  const {
    treeSitterParser = null,
    treeSitterQuery = null,
    initialViewportSize = 20,
    lineHeight = 24,
    editorPaddingPX = 4,
    indentation = 4,
    colorPrimary = "#B2B2B2",
    colorSecondary = "#212026",
    gutterSize: initialGutterSize = 2,
    gutterPadding = 1,
    logger = (s) => {
      console.log(s);
    },
    showGutter = true,
    showStatusLine = true,
  } = config;

  let gutterSize = initialGutterSize;

  const $e = node.querySelector('.wb-lines');
  Object.assign($e.style, {
    lineHeight: lineHeight+'px',
    fontSize: lineHeight+'px',
    position: 'relative',
    margin: editorPaddingPX+'px'
  });

  const $status = node.querySelector('.wb-status');
  Object.assign($status.style, {
    padding: '6px',
    background: colorSecondary,
    color: colorPrimary,
    display: showStatusLine ? '' : 'none'
  });
  const $statusLineCoord = node.querySelector('.wb-coordinate');
  const $lineCounter = node.querySelector('.wb-linecount');
  const $indentation = node.querySelector('.wb-indentation');

  const $clipboardBridge = node.querySelector('.wb-clipboard-bridge');

  const $gutter = node.querySelector('.wb-gutter');
  Object.assign($gutter.style, {
    fontSize: lineHeight+'px',
    lineHeight: lineHeight+'px',
    textAlign: 'right',
    paddingTop: editorPaddingPX+'px',
    paddingRight: editorPaddingPX*2+'px',
    backgroundColor: colorSecondary,
    color: colorPrimary,
    width: gutterSize+gutterPadding+'ch',
    display: showGutter ? '' : 'none'
  });

  const $selections = [];   // We place an invisible selection on each viewport line. We only display the active selection.
  const fragmentLines = document.createDocumentFragment();
  const fragmentSelections = document.createDocumentFragment();
  const fragmentGutters = document.createDocumentFragment();

  const detachedHead = { row : 0, col : 0};
  // In case where we have cursor, we want head === tail.
  let head = { row: 0, col: 0 };
  let tail = head;
  let maxCol = head.col;
  const Selection = {
    get ordered() { return this.isForwardSelection ? [tail, head] : [head, tail] },
    moveRow(value) {
      if (value > 0) {
        if (head.row < (Viewport.end - Viewport.start)) {                      // Inner line, Move down
          head.row ++;
          if(Viewport.lines[head.row].length >= tail.col) {
            head.col = Math.min(maxCol, Math.max(0, Viewport.lines[head.row].length));
          } else {
            head.col = Math.min(tail.col, Math.max(0, Viewport.lines[head.row].length));
          }
        } else {                                                                // Last line of viewport, scroll viewport down
          if (Viewport.end !== Model.lastIndex) {
            Viewport.scroll(1);
            head.col = Math.min(tail.col, Math.max(0, Viewport.lines[head.row].length));
          } else { }                                                             // Last line of file, No-Op.
        }
      } else {
        if (head.row === 0) {
          // First line of viewport, scroll viewport up
          Viewport.scroll(-1);
          head.col = Math.min(head.col, Math.max(0, Viewport.lines[head.row].length));
        } else {                                                                 // Inner line, move up.
          head.row--;
          // There ARE characters in the same column as the tail of the selection
          if(Viewport.lines[head.row].length >= head.col) {
            head.col = Math.min(maxCol, Math.max(0, Viewport.lines[head.row].length));
          } else {
            head.col = Math.min(head.col, Math.max(0, Viewport.lines[head.row].length));
          }
        }
      }
      render(true);
    },
    moveCol(value) {
      if (value === 1) {
        if (head.col < Viewport.lines[head.row].length - (this.isSelection ? 1 : 0 )) {    // Move right 1 character.
          maxCol = ++head.col;
        } else {
          if (head.row < (Viewport.end - Viewport.start)) {     // Move to beginning of next line.
            maxCol = head.col = 0;
            head.row++;
          } else {
            if (Viewport.end < Model.lastIndex) {               // Scroll from last line.
              head.col = 0;
              Viewport.scroll(1);
            } else {}                                         // End of file
          }
        }
      } else if (value === -1) {
        if (head.col > 0) {                                   // Move left 1 character.
          maxCol = --head.col;
        } else {
          if (head.row > 0) {                                 // Move to end of previous line
            head.row--;
            maxCol = head.col = Math.max(0, Viewport.lines[head.row].length - (this.isSelection ? 1 : 0));
          } else {
            if (Viewport.start !== 0) {                       // Scroll then move head to end of new current line.
              Viewport.scroll(-1);
              head.col = Math.max(0, Viewport.lines[head.row].length - 1);
            } else {}
          }
        }
      } else {
        console.warning(`Do not support moving by multiple values (${value}) yet `);
      }
      render();
    },
    get isSelection() {
      return head !== tail
    },
    // Assumes we are in selection
    get isForwardSelection() {
      return tail.row === head.row && tail.col < head.col || tail.row < head.row;
    },
    iosSetCursorAndRender({row, col}) {
      const linesFromViewportStart = Model.lastIndex - Viewport.start;
      // Case 1: linesFromViewportStart is outside viewport. case 2: linesFromViewportStart is less than viewport.
      const lastMeaningfulViewportRow = Math.min(Viewport.size-1, linesFromViewportStart);
      row = Math.min(row, lastMeaningfulViewportRow);
      // Cursor 1 past last character
      let positionOfLastChar = Model.lines[Viewport.start + row].length;
      this.setCursor({
        row,
        col: Math.min(col, positionOfLastChar)}
      );
      render(true);
    },
    setCursor({row, col}) {
      head.row = row;
      head.col = col;
      this.makeCursor();
    },
    get lines() {
      const [left, right] = this.ordered;
      if(left.row === right.row) {
        return [Model.lines[Viewport.start + left.row].slice(left.col, right.col + 1)];
      } else {
        const firstLine = Model.lines[Viewport.start + left.row].slice(left.col);
        const lastLine = Model.lines[Viewport.start + right.row].slice(0, right.col + 1);
        const middle = Model.lines.slice(Viewport.start + left.row + 1, Viewport.start + right.row);
        return [firstLine, ...middle, lastLine]
      }
    },
    makeCursor() {
      tail.row = head.row;
      tail.col = head.col;
      head = tail;
    },
    makeSelection() {
      head = detachedHead;
      head.row = tail.row;
      head.col = tail.col;
    },
    moveCursorStartOfLine() {
      const row = head.row;
      const realRow = Viewport.start + row;
      let col = 0;
      const line = Model.lines[realRow];
      for(let i = 0; i < line.length; i++) {
        if(line.charAt(i) !== ' ') {
          col = i;
          break;
        }
      }
      maxCol = head.col = col < tail.col ? col : 0
      render(true);
    },
    moveCursorEndOfLine() {
      const row = head.row;
      const realRow = Viewport.start + row;
      maxCol = head.col = Model.lines[realRow].length;
      render(true);
    },
    // Inserts list of string lines into the selection
    insertLines(lines) {
      if(lines.length === 1) return this.insert(lines[0]);

      const [firstEdge, secondEdge] = this.ordered
      const { index, left, _ } = this.partitionLine(firstEdge);
      const { index: secondIndex, right, rightExclusive } = this.partitionLine(secondEdge);

      Model.lines[index] = left + lines[0];
      Model.lines.splice(index+1, secondIndex - index - 1, ...lines.slice(1, -1));
      Model.lines[index + lines.length - 1] = lines[lines.length-1] + (this.isSelection ? rightExclusive : right);

      this.setCursor({row: index + lines.length - 1, col: lines[lines.length-1].length});
      render(true);
    },
    // Inserts the string s into the selection
    insert(s) {
      const t0 = performance.now();
      if (this.isSelection) {
        // Sort tail and head by order of appearance ( depends on chirality )
        const [first, second] = this.ordered;
        const { index, left } = this.partitionLine(first);
        const p = this.partitionLine({ row: second.row, col: second.col + 1 });
        const {right} = p;
        Model.splice(index, [left + s + right], second.row - first.row + 1);

        head.row = first.row;
        head.col = first.col + s.length;
        this.makeCursor();
      } else {
        const { index, left, right } = this.partitionLine(tail);
        Model.lines[index] = left + s + right;
        maxCol = head.col += s.length;
      }
      render(true);
      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      console.log(`Took ${millis.toFixed(2)} millis to insert with ${Model.lines.length} lines. That's ${1000/millis} FPS.`);
    },
    delete() {
      // TODO: Possibly, insert can be defined in terms of delete.
      if (this.isSelection) {
        return this.insert('');
      }

      const t0 = performance.now();
      let type = "character";
      const { index, left, right } = this.partitionLine(tail);
      if (tail.col > 0) {
        Model.lines[index] = left.slice(0, left.length - 1) + right;
        head.col--;
      } else if (tail.row > 0) {
        head.col = Model.lines[index - 1].length;
        head.row--;
        Model.lines[index - 1] += Model.lines[index];
        Model.delete(index);
        type = "line";
      }
      render(true);
      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      console.log(`Took ${millis.toFixed(2)} millis to delete ${type} with ${Model.lines.length} lines. That's ${1000/millis} FPS.`);
    },
    newLine() {
      // TODO: handle redundant rendering
      if (this.isSelection) Selection.insert('');

      const t0 = performance.now();
      const { index, left, right } = this.partitionLine(tail);
      Model.lines[index] = left;
      Model.splice(index + 1, [right]);
      head.col = 0;
      if (tail.row < Viewport.size - 1) {
        head.row++;
      } else {
        Viewport.scroll(1);
      }
      render(true);
      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      console.log(`Took ${millis.toFixed(2)} millis to insert new line with ${Model.lines.length} lines. That's ${1000/millis} FPS.`);
    },
    moveBackWord() {
      const s = Model.lines[head.row];
      const n = s.length;

      if(head.col === 0) {
        // TODO: handle viewport scroll
        if(head.row > 0) {
          head.row--;
          head.col = Viewport.lines[head.row].length;
        }
      } else {
        const isSpace = ch => /\s/.test(ch);
        const isWord = ch => /[\p{L}\p{Nd}_]/u.test(ch);
        let j = head.col;
        if (isSpace(s[j])) { // Case 1: at whitespace → skip to next non-space character
          while (j > 0 && isSpace(s[j])) j--;
          while (j > 0 && isWord(s[j])) j--;
        } else if (isWord(s[j])) { // Case 2: at word-chars → consume word run to 1 past the word
          while (j > 0 && isWord(s[j])) j--;
        } else { // Case 3: at punctuation/symbols
          const c = s[j];
          j--;
          // Consuming continuous sequence of the same char
          while( j > 0 && s[j] === c) j--;
        }
        head.col = j;
      }

      render(true);
    },
    moveWord() {
      const s = Model.lines[head.row];
      const n = s.length;

      if(head.col === n) { // Edge case: At last character of line
        // TODO: handle viewport scroll
        // TODO: handle last row of file
        head.col = 0;
        head.row++;
      } else {
        const isSpace = ch => /\s/.test(ch);
        const isWord = ch => /[\p{L}\p{Nd}_]/u.test(ch);
        let j = head.col;
        if (isSpace(s[j])) { // Case 1: at whitespace → skip run to end of spaces, then next non-word
          while (j < n && isSpace(s[j])) j++;
          while (j < n && isWord(s[j])) j++;
        } else if (isWord(s[j])) { // Case 2: at word-chars → consume word run to 1 past the word
          while (j < n && isWord(s[j])) j++;
        } else { // Case 3: at punctuation/symbols
          const c = s[j];
          j++;
          // Consuming continuous sequence of the same char
          while( j < n && s[j] === c) j++;
        }
        head.col = j;
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
      // Note: Vim, VSCode, Intellij all has slightly different unindent behavior.
      // VSCode: for lines not aligned at a multiple of indentation number of spaces, align them to the
      // first such position.
      // vim: removes the selection, although it does keep a hidden memory of the most recent indentation operation which you can repeat.
      // intellij: move all selected lines by indentation of number spaces, unless there is not enough to unindent
      // Currently we follow intellij implementation but perhaps VSCode's is the best.
      const [first, second] = this.ordered;

      for(let i = first.row; i <= second.row; i++) {
        if( i  === first.row || i === second.row) {
          const cursor = i === first.row ? first : second;
          // Cursor movement of first and second depends on spaces left and right of it .
          let indentableSpacesLeftOfCursor = 0;
          let indentableSpacesFromCursor = 0 ;
          const s = Viewport.lines[cursor.row];
          let j = cursor.col;
          while (j < s.length && s.charAt(j) === ' ') j++;
          indentableSpacesFromCursor = j - cursor.col ;
          j = 0; while (j < cursor.col && s.charAt(j) === ' ') j++;
          indentableSpacesLeftOfCursor = j;
          const unindentationsFirstLine = Math.min(indentation,
            indentableSpacesLeftOfCursor + indentableSpacesFromCursor);
          Model.lines[Viewport.start + cursor.row] = Model.lines[cursor.row].slice(unindentationsFirstLine);
          if(indentableSpacesFromCursor < unindentationsFirstLine)
            cursor.col -= unindentationsFirstLine - indentableSpacesFromCursor;
        } else {
          const realRow = Viewport.start + i;
          const line = Model.lines[realRow];
          let maxUnindent = 0;
          for(let i = 0; i < Math.min(indentation, line.length); i++) {
            if (line.charAt(0) === " ") {
              maxUnindent++;
            } else {
              break;
            }
          }
          Model.lines[realRow] = line.slice(maxUnindent);
        }
      }

      render(true);
    },
    // Utility to extract the text left, right, and character at the col of the
    // position for the row of the position.
    partitionLine({ row, col }) {
      const index = Viewport.start + row;
      const line = Model.lines[index];
      return {
        index,
        left: line.slice(0, col),
        right: line.slice(col),
        // In the case where the partitioning point is a selection, we exclude the character
        // at th cursor
        rightExclusive: line.slice(col+1)
      }
    }
  };

  const Model = {
    lines: [''],
   
    byteCount: "",
    originalLineCount: 0,
    treeSitterTree: null,
    treeSitterCaptures: [],

    useChunkedMode: false,
    chunks: [],
    chunkSize: 50_000,
    totalLines: 0,
    buffer: [],           // Current chunk decompressed
    currentChunkIndex: -1, // -1 = buffer is incomplete last chunk, 0+ = buffer holds chunks[currentChunkIndex] decompressed
    prevBuffer: [],       // Previous chunk decompressed (currentChunkIndex - 1)
    nextBuffer: [],       // Next chunk decompressed (currentChunkIndex + 1)
    _textEncoder: new TextEncoder(),
    _textDecoder: new TextDecoder(),
    activateChunkMode(chunkSize = 50_000) {
        // Ensure Viewport does not straddle more than 2 chunks.
        // TODO: we don't enforce this invariant when setting Viewport.size
        if (Viewport.size >= chunkSize) {
          throw new Error(`Viewport ${Viewport.size} can't be larger than chunkSize ${chunkSize}`);
        }
        this.useChunkedMode = true;
        this.chunks = [];
        this.buffer = [];
        this.totalLines = 0;
        this.lines = [];
        this.currentChunkIndex = -1;
        this.prevBuffer = [];
        this.nextBuffer = [];
        this.chunkSize = chunkSize;
    },

    get lastIndex() { return this.useChunkedMode ? this.totalLines - 1 : this.lines.length - 1 },

    set text(text) {
      this.lines = text.split("\n");
      this.byteCount = new TextEncoder().encode(text).length
      this.originalLineCount = this.lines.length;
      if(treeSitterParser && treeSitterQuery) {
        this.treeSitterTree = treeSitterParser.parse(text);
        this.treeSitterCaptures = treeSitterQuery.captures(this.treeSitterTree.rootNode);
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

    async appendLines(newLines, skipRender = false) {
      if (this.useChunkedMode) {
        // Calculate chunk indices based on totalLines
        let startChunkIndex = Math.floor(this.totalLines / this.chunkSize);
        let startPosInChunk = this.totalLines % this.chunkSize;

        let remainingLines = newLines;
        // Store some in current chunk
        if(startChunkIndex == this.currentChunkIndex) {
          const remainingSpace = this.chunkSize - this.buffer.length;
          const linesToCurrentChunk = newLines.slice(0, remainingSpace);
          remainingLines = newLines.slice(remainingSpace);
          this.buffer.push(linesToCurrentChunk);
          this.totalLines += remainingSpace;
          startChunkIndex++;
          startPosInChunk = 0;
        }

        while(remainingLines.length != 0) {
          let remainingSpaceInChunk = this.chunkSize - startPosInChunk;
            // All remaining lines fit in current chunk
          if(remainingLines.length <= remainingSpaceInChunk) {
            // Either new chunk or existing chunk
            let chunkLines = [];
            if (startChunkIndex < this.chunks.length) {
              chunkLines = await this._decompressChunk(startChunkIndex);
            }

            chunkLines.push(...remainingLines);
            this.totalLines += remainingLines.length;

            await this._compressChunk(startChunkIndex, chunkLines);

            remainingLines = [];
          } else {
            const linesInChunk = remainingLines.slice(0, remainingSpaceInChunk);
            remainingLines = remainingLines.slice(remainingSpaceInChunk);

            // 1. Read chunk out of compression (if it exists)
            let chunkLines = [];
            if (startChunkIndex < this.chunks.length) {
              chunkLines = await this._decompressChunk(startChunkIndex);
            }

            // 2. Append linesInChunk to chunk
            chunkLines.push(...linesInChunk);
            this.totalLines += linesInChunk.length;

            // 3. Recompress chunk
            await this._compressChunk(startChunkIndex, chunkLines);

            startChunkIndex++;
            startPosInChunk = 0;
          }
        }
      } else {
        // Legacy mode for small files
        this.lines.push(...newLines);
      }
      if (!skipRender) render();
    },

    // Compress chunk at given index using gzip
    async _compressChunk(chunkIndex, lines) {
      logger(`[Compress] Compressing chunk ${chunkIndex} (${lines.length} lines)`);
      const text = lines.join('\n');
      const data = this._textEncoder.encode(text);

      // Use CompressionStream API (gzip)
      const stream = new ReadableStream({ start(controller) { controller.enqueue(data); controller.close(); }});

      const chunks = [];
      const reader = stream.pipeThrough(new CompressionStream('gzip')).getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine all Uint8Array chunks into one
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      if (chunkIndex < this.chunks.length) {
        this.chunks[chunkIndex] = result;
      } else {
        this.chunks.push(result);
      }
      logger(`[Compress] Chunk ${chunkIndex} compressed: ${(result.length / 1024).toFixed(2)} KB`);
    },

    // Decompress chunk at given index
    async _decompressChunk(chunkIndex) {
      logger(`[Decompress] Decompressing chunk ${chunkIndex}`);
      const compressed = this.chunks[chunkIndex];
      const stream = new ReadableStream({ start(controller) { controller.enqueue(compressed); controller.close(); }});

      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const chunks = [];
      const reader = decompressedStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Efficiently concatenate Uint8Array chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      const text = this._textDecoder.decode(result);
      const lines = text.split('\n');
      logger(`[Decompress] Chunk ${chunkIndex} decompressed: ${lines.length} lines`);
      return lines;
    },
  }
  const Viewport = {
    start: 0, // 0-indexed line number in Model buffer.
    size: initialViewportSize,

    get end() {
      return Math.min(this.start + this.size - 1, Model.lastIndex);
    },

    // @param i, amount to scroll viewport by.
    scroll(i) {
      const t0 = performance.now();
      this.start += i;
      this.start = $clamp(this.start, 0, Model.lastIndex);
      render();
      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      const lineCount = Model.useChunkedMode ? Model.totalLines : Model.lines.length;
      console.log(`Took ${millis.toFixed(2)} millis to scroll viewport with ${lineCount} lines. That's ${1000/millis} FPS.`);
    },

    set(start, size) {
      this.start = $clamp(start-1, 0, Model.lastIndex);
      if(this.size !== size) {
        this.size = size;
        render(true);
      } else {
        render();
      }
    },

    get lines() {
      if (Model.useChunkedMode) {
        const startChunkIndex = Math.floor(this.start / Model.chunkSize);
        const endChunkIndex = Math.floor(this.end / Model.chunkSize);

        // Check if we need to load new chunks
        if(Model.currentChunkIndex !== startChunkIndex) {
          // Asynchronously load prev, current, and next chunks
          const loadChunks = async () => {
            const prevChunkIndex = startChunkIndex - 1;
            const nextChunkIndex = startChunkIndex + 1;

            logger(`[Buffer] Loading 3-chunk window:`);
            logger(`  - Prev: ${prevChunkIndex >= 0 && prevChunkIndex < Model.chunks.length ? prevChunkIndex : 'none'}`);
            logger(`  - Current: ${startChunkIndex}`);
            logger(`  - Next: ${nextChunkIndex < Model.chunks.length ? nextChunkIndex : 'none'}`);

            Model.currentChunkIndex = startChunkIndex;

            // Load current chunk
            Model.buffer = await Model._decompressChunk(startChunkIndex);

            // Load previous chunk if it exists
            if (prevChunkIndex >= 0 && prevChunkIndex < Model.chunks.length) {
              Model.prevBuffer = await Model._decompressChunk(prevChunkIndex);
            } else {
              Model.prevBuffer = [];
            }

            // Load next chunk if it exists
            if (nextChunkIndex < Model.chunks.length) {
              Model.nextBuffer = await Model._decompressChunk(nextChunkIndex);
            } else {
              Model.nextBuffer = [];
            }

            logger(`[Buffer] 3-chunk window loaded successfully`);
            render(); // Re-render once decompressed
          };

          loadChunks();
          return Array(this.size).fill("..."); // Show placeholders while decompressing
        }

        // Build result from available chunks
        const result = [];
        for (let i = this.start; i <= this.end; i++) {
          const chunkIndex = Math.floor(i / Model.chunkSize);
          const lineInChunk = i % Model.chunkSize;

          if (chunkIndex === startChunkIndex - 1 && Model.prevBuffer.length > 0) {
            result.push(Model.prevBuffer[lineInChunk] || '');
          } else if (chunkIndex === startChunkIndex) {
            result.push(Model.buffer[lineInChunk] || '');
          } else if (chunkIndex === startChunkIndex + 1 && Model.nextBuffer.length > 0) {
            result.push(Model.nextBuffer[lineInChunk] || '');
          } else {
            result.push('');
          }
        }
        return result;
      }

      // Legacy mode
      return Model.lines.slice(this.start, this.end + 1);
    },
  };

  const lastRender = {
    lineCount: -1
  };

  function populateSelections() {
    for (let i = 0; i < Viewport.size; i++) {
      const sel = document.createElement("div");
      sel.className = "wb-selection";
      Object.assign(sel.style, {
        display: 'block',
        visibility: 'hidden',
        width: '1ch',
        height: lineHeight+'px',
        fontSize: lineHeight+'px',
        top: i * lineHeight+'px'
      });
      $selections[i] = fragmentSelections.appendChild(sel);
    }
    $e.appendChild(fragmentSelections);
  }
  function render(renderLineContainers = false) {
    if (lastRender.lineCount !== Model.lastIndex + 1 ) {
      const lineCount = lastRender.lineCount = Model.lastIndex + 1;
      $lineCounter.textContent = `${lineCount.toLocaleString()}L, originally: ${Model.originalLineCount}L ${Model.byteCount} bytes`;
    }

    // TODO: nit: we don't reclaim and shrink the gutter if the text get smaller.
    const digitsInLargestLineNumber = Viewport.end.toString().length;
    if(digitsInLargestLineNumber > gutterSize) {
      gutterSize = digitsInLargestLineNumber;
      $gutter.style.width = gutterSize + gutterPadding + 'ch';
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

    if(Model.treeSitterTree && Model.treeSitterCaptures) {
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
          $selections[i].style.width = content.length+'ch';
        } else {
          // For empty line, we still render 1 character selection
          $selections[i].style.width = '1ch';
        }
      }
    }

    // Render the leading and heading selection line
    $selections[firstEdge.row].style.left = firstEdge.col+'ch';
    if (secondEdge.row === firstEdge.row) {
      $selections[firstEdge.row].style.width = secondEdge.col - firstEdge.col + 1 +'ch';
      $selections[firstEdge.row].style.visibility = 'visible';
    } else {
      if(firstEdge.row < Viewport.lines.length) { // TODO: this can be removed if selection is constrained to source content
        const text = Viewport.lines[firstEdge.row];

        // There is edge case where text.length - firstEdge.col is 0. Namely, if the selection started
        // on the last cursor position, menaing the cursor is between the last char and new line.
        // We want to render 1 char to represent this new line.
        $selections[firstEdge.row].style.width = Math.max(1, text.length - firstEdge.col)+'ch';
        $selections[firstEdge.row].style.visibility = 'visible';
      }
      if(secondEdge.row < Viewport.lines.length) {
        const text = Viewport.lines[secondEdge.row];
        if(secondEdge.col >= text.length) {
          console.warn(`secondEdge's column ${secondEdge.col} is too far beyond the text with length: `, text.length);
        }
        $selections[secondEdge.row].style.width = Math.min(secondEdge.col + 1, text.length)+'ch';
        $selections[secondEdge.row].style.visibility = 'visible';
      }
    }
    // * END render selection

    // TODO: this is infrequently changed. Render it ad-hoc in the mutator method.
    $indentation.innerHTML = `Spaces: ${indentation}`;

    $statusLineCoord.innerHTML = `Ln ${Viewport.start + head.row + 1 }, Col ${tail.col + 1 }`;

    return this;
  }
  this.Viewport = Viewport;
  this.Model = Model;
  this.Selection = Selection;
  // TODO: Needs rework. This temporary for the file-loader log viewer. 
  this.appendLineAtEnd = (s) => {
    if(Model.lines[0] == '') {
      Model.lines[0] = s;
    } else {
      Model.lines[Model.lines.length] = s;
    }
   
    Viewport.start = Math.max(0, Model.lines.length - Viewport.size - 1);
    render(true);
  };

  render(true);

  // Reading clipboard from the keydown listener involves a different security model.
  node.addEventListener('paste', e => {
    e.preventDefault(); // stop browser from inserting raw clipboard text
    const text = e.clipboardData.getData("text/plain");
    if (text) {
      Selection.insertLines(text.split("\n"));
    }
  });

  // Triggered by a keydown paste event. a copy event handler can read the clipboard
  // by the standard security model. Meanwhile, we don't have to make the editor "selectable".
  node.addEventListener('copy', e => {
    e.preventDefault();                    // take over the clipboard contents
    e.clipboardData.setData('text/plain', Selection.lines.join("\n"));
  });

  // Bind keyboard control to move viewport
  node.addEventListener('keydown', event => {
    // Do nothing for Meta+V (on Mac) or Ctrl+V (on Windows/Linux) as to avoid conflict with the paste event.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
      // just return, no preventDefault, no custom handling
      return;
    }

    // On Ctrl/⌘+C, *don’t* preventDefault. Just redirect selection briefly.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      $clipboardBridge.focus({ preventScroll: true }); // Prevent browser from scrolling to textarea
      $clipboardBridge.select();
      return;
    }

    if(event.key.startsWith("Arrow")) {
      event.preventDefault(); // prevents page scroll

      if(event.metaKey) {
        if(!event.shiftKey && Selection.isSelection) Selection.makeCursor();
        if(event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if(event.key === "ArrowLeft") {
          Selection.moveCursorStartOfLine();
        } else if (event.key === "ArrowRight") {
          Selection.moveCursorEndOfLine();
        }
      } else if (event.altKey) {
        if(!event.shiftKey && Selection.isSelection) Selection.makeCursor();
        if(event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if(event.key === "ArrowLeft") {
          Selection.moveBackWord();
        } else if (event.key === "ArrowRight") {
          Selection.moveWord();
        }
      } else if (!event.shiftKey && Selection.isSelection) { // no meta key, no shift key, selection.
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
      } else { // no meta key.
        // TODO: handle special case where begin a selection and we are at last character on line
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
    } else if (Model.useChunkedMode) { // navigation-only in chunked mode.
      return;
    } else if (event.key === "Backspace") {
      Selection.delete();
    } else if (event.key === "Enter") {
      Selection.newLine();
    } else if (event.key === "Escape") {
    } else if (event.key === "Tab" ) {
      // prevents tabbing to next item
      // TODO: fix as it may break accessibility for some users
      event.preventDefault();

      if(Selection.isSelection) {
        if(event.shiftKey) {
          Selection.unindent();
        } else {
          Selection.indent();
        }
      } else {
        if(event.shiftKey) {
          Selection.unindent();
        } else {
          Selection.insert(" ".repeat(indentation));
        }
      }
    } else if (event.key.length > 1) {
      console.warn('Ignoring unknown key: ', event.code, event.key);
    } else if (event.key === "Shift") {
    } else if (event.key === " ") {
      event.preventDefault();
      Selection.insert(" ");
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
