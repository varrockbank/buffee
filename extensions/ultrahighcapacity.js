/**
 * @fileoverview BuffeeUltraHighCapacity - Ultra-high-capacity file loading extension for Buffee.
 * Enables loading and viewing very large files (1B+ lines) using gzip compression and chunked storage.
 * @version 1.0.0
 */

/**
 * Initializes ultra-high-capacity mode for a Buffee instance.
 * When activated, the editor enters navigate mode (can scroll, no editing) and handles large files efficiently
 * by compressing lines into chunks and decompressing on-demand.
 *
 * @param {Buffee} editor - The Buffee instance to extend
 * @returns {Object} The UltraHighCapacity API object
 * @example
 * const editor = new Buffee(document.getElementById('editor'));
 * BuffeeUltraHighCapacity(editor);
 * editor.UltraHighCapacity.activate();
 * await editor.UltraHighCapacity.appendLines(largeArrayOfLines);
 */
function BuffeeUltraHighCapacity(editor) {
  const $e = editor._$e;
  const render = editor._render;
  const renderHooks = editor._renderHooks;
  const appendLines = editor._appendLines;
  const { Viewport, Model } = editor;

  // Store original methods/getters
  const originalLastIndexGetter = Object.getOwnPropertyDescriptor(Model, 'lastIndex').get;
  const originalAppendLines = appendLines;

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
   * Loads chunks around the viewport and updates Model.lines.
   * @private
   */
  function loadChunksForViewport() {
    const startChunkIndex = Math.floor(Viewport.start / chunkSize);

    // Check if we need to load new chunks
    if (currentChunkIndex !== startChunkIndex) {
      const loadChunks = async () => {
        const prevChunkIndex = startChunkIndex - 1;
        const nextChunkIndex = startChunkIndex + 1;

        currentChunkIndex = startChunkIndex;

        // Load current chunk (if it exists)
        if (startChunkIndex < chunks.length) {
          buffer = await decompressChunk(startChunkIndex);
        } else {
          buffer = [];
        }

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
    }
  }

  /**
   * Gets a line from chunked storage by absolute index.
   * @private
   */
  function getChunkedLine(lineIndex) {
    const chunkIdx = Math.floor(lineIndex / chunkSize);
    const lineInChunk = lineIndex % chunkSize;
    const startChunkIndex = currentChunkIndex;

    if (chunkIdx === startChunkIndex - 1 && prevBuffer.length > 0) {
      return prevBuffer[lineInChunk] || '';
    } else if (chunkIdx === startChunkIndex) {
      return buffer[lineInChunk] || '';
    } else if (chunkIdx === startChunkIndex + 1 && nextBuffer.length > 0) {
      return nextBuffer[lineInChunk] || '';
    } else {
      return '...';
    }
  }

  /**
   * Creates a Proxy for Model.lines that returns chunked content.
   * @private
   */
  function createLinesProxy() {
    return new Proxy([], {
      get(target, prop) {
        if (prop === 'length') {
          return totalLines;
        }
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          loadChunksForViewport();
          return getChunkedLine(parseInt(prop, 10));
        }
        return target[prop];
      }
    });
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
   * UltraHighCapacity API.
   * @namespace UltraHighCapacity
   */
  const UltraHighCapacity = {
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

      // Replace Model.lines with a Proxy that returns chunked content
      Model.lines = createLinesProxy();

      // Set navigation-only mode (can move cursor, no editing)
      editor.interactive = 0;

      // Override Model.lastIndex
      Object.defineProperty(Model, 'lastIndex', {
        get: () => totalLines - 1,
        configurable: true
      });

      // Override _appendLines
      editor._appendLines = appendChunkedLines;

      render(true);
    },

    /**
     * Deactivates chunked mode and restores normal operation.
     */
    deactivate() {
      enabled = false;

      // Restore original lastIndex getter
      Object.defineProperty(Model, 'lastIndex', {
        get: originalLastIndexGetter,
        configurable: true
      });

      // Restore Model.lines to a regular array
      Model.lines = [];

      // Restore original appendLines
      editor._appendLines = originalAppendLines;

      // Restore normal mode (full editing)
      editor.interactive = 1;

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
        throw new Error('UltraHighCapacity is not activated. Call activate() first.');
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

  // Attach to editor instance
  editor.UltraHighCapacity = UltraHighCapacity;

  return UltraHighCapacity;
}
