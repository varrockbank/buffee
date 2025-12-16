/**
 * @fileoverview VbufChunkLoader - Chunked file loading extension for Vbuf.
 * Enables loading and viewing very large files using gzip compression and chunked storage.
 * @version 1.0.0
 */

/**
 * Initializes chunked file loading for a Vbuf instance.
 * When activated, the editor enters navigate mode (can scroll, no editing) and handles large files efficiently
 * by compressing lines into chunks and decompressing on-demand.
 *
 * @param {Vbuf} vbuf - The Vbuf instance to extend
 * @returns {Object} The ChunkLoader API object
 * @example
 * const editor = new Vbuf(document.getElementById('editor'));
 * const ChunkLoader = VbufChunkLoader(editor);
 * ChunkLoader.activate();
 * await ChunkLoader.appendLines(largeArrayOfLines);
 */
function VbufChunkLoader(vbuf) {
  const { $e, render, renderHooks } = vbuf._internals;
  const { Viewport, Model } = vbuf;

  // Store original methods/getters
  const originalLastIndexGetter = Object.getOwnPropertyDescriptor(Model, 'lastIndex').get;
  const originalLinesGetter = Object.getOwnPropertyDescriptor(Viewport, 'lines').get;
  const originalAppendLines = Model.appendLines.bind(Model);

  // Chunk state
  let enabled = false;
  let chunks = [];
  let chunkSize = 50_000;
  let totalLines = 0;
  let buffer = [];
  let currentChunkIndex = -1;
  let prevBuffer = [];
  let nextBuffer = [];
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  /**
   * Compresses lines into a gzip chunk.
   * @private
   */
  async function compressChunk(chunkIndex, lines) {
    const text = lines.join('\n');
    const data = textEncoder.encode(text);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });

    const compressedChunks = [];
    const reader = stream.pipeThrough(new CompressionStream('gzip')).getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      compressedChunks.push(value);
    }

    const resultLength = compressedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(resultLength);
    let offset = 0;
    for (const chunk of compressedChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    if (chunkIndex < chunks.length) {
      chunks[chunkIndex] = result;
    } else {
      chunks.push(result);
    }
  }

  /**
   * Decompresses a gzip chunk and returns the lines.
   * @private
   */
  async function decompressChunk(chunkIndex) {
    const compressed = chunks[chunkIndex];
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressed);
        controller.close();
      }
    });

    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const decompressedChunks = [];
    const reader = decompressedStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      decompressedChunks.push(value);
    }

    const resultLength = decompressedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(resultLength);
    let offset = 0;
    for (const chunk of decompressedChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    const text = textDecoder.decode(result);
    return text.split('\n');
  }

  /**
   * Gets viewport lines from chunked storage.
   * @private
   */
  function getChunkedLines() {
    const startChunkIndex = Math.floor(Viewport.start / chunkSize);

    // Check if we need to load new chunks
    if (currentChunkIndex !== startChunkIndex) {
      const loadChunks = async () => {
        const prevChunkIndex = startChunkIndex - 1;
        const nextChunkIndex = startChunkIndex + 1;

        currentChunkIndex = startChunkIndex;

        // Load current chunk
        buffer = await decompressChunk(startChunkIndex);

        // Load previous chunk if it exists
        if (prevChunkIndex >= 0 && prevChunkIndex < chunks.length) {
          prevBuffer = await decompressChunk(prevChunkIndex);
        } else {
          prevBuffer = [];
        }

        // Load next chunk if it exists
        if (nextChunkIndex < chunks.length) {
          nextBuffer = await decompressChunk(nextChunkIndex);
        } else {
          nextBuffer = [];
        }

        render();
      };

      loadChunks();
      return Array(Viewport.size).fill("...");
    }

    // Build result from available chunks
    const result = [];
    for (let i = Viewport.start; i <= Viewport.end; i++) {
      const chunkIdx = Math.floor(i / chunkSize);
      const lineInChunk = i % chunkSize;

      if (chunkIdx === startChunkIndex - 1 && prevBuffer.length > 0) {
        result.push(prevBuffer[lineInChunk] || '');
      } else if (chunkIdx === startChunkIndex) {
        result.push(buffer[lineInChunk] || '');
      } else if (chunkIdx === startChunkIndex + 1 && nextBuffer.length > 0) {
        result.push(nextBuffer[lineInChunk] || '');
      } else {
        result.push('');
      }
    }
    return result;
  }

  /**
   * Appends lines in chunked mode.
   * @private
   */
  async function appendChunkedLines(newLines, skipRender = false) {
    let startChunkIndex = Math.floor(totalLines / chunkSize);
    let startPosInChunk = totalLines % chunkSize;

    let remainingLines = newLines;

    // Store some in current buffer
    if (startChunkIndex === currentChunkIndex) {
      const remainingSpace = chunkSize - buffer.length;
      const linesToCurrentChunk = newLines.slice(0, remainingSpace);
      remainingLines = newLines.slice(remainingSpace);
      buffer.push(...linesToCurrentChunk);
      totalLines += linesToCurrentChunk.length;
      startChunkIndex++;
      startPosInChunk = 0;
    }

    while (remainingLines.length !== 0) {
      const remainingSpaceInChunk = chunkSize - startPosInChunk;

      if (remainingLines.length <= remainingSpaceInChunk) {
        let chunkLines = [];
        if (startChunkIndex < chunks.length) {
          chunkLines = await decompressChunk(startChunkIndex);
        }

        chunkLines.push(...remainingLines);
        totalLines += remainingLines.length;

        await compressChunk(startChunkIndex, chunkLines);
        remainingLines = [];
      } else {
        const linesInChunk = remainingLines.slice(0, remainingSpaceInChunk);
        remainingLines = remainingLines.slice(remainingSpaceInChunk);

        let chunkLines = [];
        if (startChunkIndex < chunks.length) {
          chunkLines = await decompressChunk(startChunkIndex);
        }

        chunkLines.push(...linesInChunk);
        totalLines += linesInChunk.length;

        await compressChunk(startChunkIndex, chunkLines);
        startChunkIndex++;
        startPosInChunk = 0;
      }
    }

    if (!skipRender) render();
  }

  /**
   * ChunkLoader API.
   * @namespace ChunkLoader
   */
  const ChunkLoader = {
    /**
     * Whether chunked mode is currently active.
     * @type {boolean}
     */
    get enabled() { return enabled; },

    /**
     * Total number of lines in chunked storage.
     * @type {number}
     */
    get totalLines() { return totalLines; },

    /**
     * Number of compressed chunks.
     * @type {number}
     */
    get chunkCount() { return chunks.length; },

    /**
     * Total compressed size in bytes.
     * @type {number}
     */
    get compressedSize() {
      return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    },

    /**
     * Activates chunked mode for handling large files.
     * Disables editing and sets up chunk storage.
     * @param {number} [size=50000] - Number of lines per chunk
     * @throws {Error} If viewport size is larger than chunk size
     */
    activate(size = 50_000) {
      if (Viewport.size >= size) {
        throw new Error(`Viewport ${Viewport.size} can't be larger than chunkSize ${size}`);
      }

      enabled = true;
      chunkSize = size;
      chunks = [];
      buffer = [];
      totalLines = 0;
      currentChunkIndex = -1;
      prevBuffer = [];
      nextBuffer = [];
      Model.lines = [];

      // Set navigate mode (can scroll, no editing)
      vbuf.editMode = 'navigate';

      // Override Model.lastIndex
      Object.defineProperty(Model, 'lastIndex', {
        get: () => totalLines - 1,
        configurable: true
      });

      // Override Viewport.lines
      Object.defineProperty(Viewport, 'lines', {
        get: getChunkedLines,
        configurable: true
      });

      // Override Model.appendLines
      Model.appendLines = appendChunkedLines;

      render(true);
    },

    /**
     * Deactivates chunked mode and restores normal operation.
     */
    deactivate() {
      enabled = false;

      // Restore original getters
      Object.defineProperty(Model, 'lastIndex', {
        get: originalLastIndexGetter,
        configurable: true
      });

      Object.defineProperty(Viewport, 'lines', {
        get: originalLinesGetter,
        configurable: true
      });

      // Restore original appendLines
      Model.appendLines = originalAppendLines;

      // Restore write mode
      vbuf.editMode = 'write';

      // Clear chunk data
      chunks = [];
      buffer = [];
      totalLines = 0;
      currentChunkIndex = -1;
      prevBuffer = [];
      nextBuffer = [];

      render(true);
    },

    /**
     * Appends lines to the chunked storage.
     * @param {string[]} lines - Lines to append
     * @param {boolean} [skipRender=false] - Whether to skip re-rendering
     * @returns {Promise<void>}
     */
    async appendLines(lines, skipRender = false) {
      if (!enabled) {
        throw new Error('ChunkLoader is not activated. Call activate() first.');
      }
      await appendChunkedLines(lines, skipRender);
    },

    /**
     * Clears all chunked data.
     */
    clear() {
      chunks = [];
      buffer = [];
      totalLines = 0;
      currentChunkIndex = -1;
      prevBuffer = [];
      nextBuffer = [];
      render(true);
    }
  };

  // Attach to vbuf instance
  vbuf.ChunkLoader = ChunkLoader;

  return ChunkLoader;
}
