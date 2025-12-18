/**
 * @fileoverview BuffeeFileLoader - File loading extension for Buffee.
 * Provides multiple file loading strategies optimized for different file sizes.
 * @version 1.0.0
 */

/**
 * Initializes file loading capabilities for a Buffee instance.
 *
 * @param {Buffee} vbuf - The Buffee instance to extend
 * @returns {Object} The FileLoader API object
 * @example
 * const editor = new Buffee(document.getElementById('editor'));
 * BuffeeFileLoader(editor);
 * await editor.FileLoader.streamMaterializedLoad(file);
 */
function BuffeeFileLoader(vbuf) {
  const { Model, _internals } = vbuf;

  /**
   * FileLoader API.
   * @namespace FileLoader
   */
  const FileLoader = {
    /**
     * Naive loader - reads entire file into memory at once.
     * Best for small files (<10MB).
     * @param {File} file - The file to load
     * @returns {Promise<{lines: number, timeMs: number}>}
     */
    async naiveLoad(file) {
      const t0 = performance.now();
      const text = await file.text();
      Model.text = text;
      const t1 = performance.now();
      return {
        lines: Model.lines.length,
        timeMs: t1 - t0
      };
    },

    /**
     * Chunked loader using Blob.text() - reads file in 1MB chunks.
     * Good for medium files (<70M lines).
     * @param {File} file - The file to load
     * @param {Object} [options]
     * @param {number} [options.chunkSize=1048576] - Chunk size in bytes (default 1MB)
     * @returns {Promise<{lines: number, timeMs: number}>}
     */
    async chunkedBlobLoad(file, options = {}) {
      const chunkSize = options.chunkSize || 1 * 1024 * 1024;
      const t0 = performance.now();

      Model.lines = [];
      let offset = 0;
      let remainder = '';
      let totalLines = 0;

      while (offset < file.size) {
        const blob = file.slice(offset, offset + chunkSize);
        const text = await blob.text();
        const fullText = remainder + text;
        const lastNewlineIndex = fullText.lastIndexOf('\n');

        if (lastNewlineIndex !== -1) {
          const completeText = fullText.substring(0, lastNewlineIndex);
          const lines = completeText.split('\n');
          _internals.appendLines(lines);
          totalLines += lines.length;
          remainder = fullText.substring(lastNewlineIndex + 1);
        } else {
          remainder = fullText;
        }
        offset += chunkSize;
      }

      if (remainder.length > 0) {
        _internals.appendLines([remainder]);
        totalLines++;
      }

      const t1 = performance.now();
      return {
        lines: totalLines,
        timeMs: t1 - t0
      };
    },

    /**
     * Chunked loader using FileReader API - reads file in 1MB chunks.
     * Alternative to chunkedBlobLoad for older browser compatibility.
     * @param {File} file - The file to load
     * @param {Object} [options]
     * @param {number} [options.chunkSize=1048576] - Chunk size in bytes (default 1MB)
     * @returns {Promise<{lines: number, timeMs: number}>}
     */
    async chunkedFileReaderLoad(file, options = {}) {
      const chunkSize = options.chunkSize || 1 * 1024 * 1024;
      const t0 = performance.now();

      Model.lines = [];
      let offset = 0;
      let remainder = '';
      let totalLines = 0;

      function readBlobAsText(blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsText(blob);
        });
      }

      while (offset < file.size) {
        const blob = file.slice(offset, offset + chunkSize);
        const text = await readBlobAsText(blob);
        const fullText = remainder + text;
        const lastNewlineIndex = fullText.lastIndexOf('\n');

        if (lastNewlineIndex !== -1) {
          const completeText = fullText.substring(0, lastNewlineIndex);
          const lines = completeText.split('\n');
          _internals.appendLines(lines);
          totalLines += lines.length;
          remainder = fullText.substring(lastNewlineIndex + 1);
        } else {
          remainder = fullText;
        }
        offset += chunkSize;
      }

      if (remainder.length > 0) {
        _internals.appendLines([remainder]);
        totalLines++;
      }

      const t1 = performance.now();
      return {
        lines: totalLines,
        timeMs: t1 - t0
      };
    },

    /**
     * Streaming loader using ReadableStream.
     * Good for large files (<70M lines).
     * @param {File} file - The file to load
     * @param {Object} [options]
     * @param {number} [options.yieldEvery=10] - Yield to browser every N chunks
     * @returns {Promise<{lines: number, timeMs: number}>}
     */
    async streamLoad(file, options = {}) {
      const yieldEvery = options.yieldEvery || 10;
      const t0 = performance.now();

      Model.lines = [];
      let remainder = '';
      let totalLines = 0;
      const decoder = new TextDecoder('utf-8');
      const reader = file.stream().getReader();
      let chunkCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const fullText = remainder + text;
          const lastNewlineIndex = fullText.lastIndexOf('\n');

          if (lastNewlineIndex !== -1) {
            const completeText = fullText.substring(0, lastNewlineIndex);
            const lines = completeText.split('\n');
            _internals.appendLines(lines);
            totalLines += lines.length;
            remainder = fullText.substring(lastNewlineIndex + 1);
          } else {
            remainder = fullText;
          }

          chunkCount++;
          if (chunkCount % yieldEvery === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        if (remainder.length > 0) {
          _internals.appendLines([remainder]);
          totalLines++;
        }
      } finally {
        reader.releaseLock();
      }

      const t1 = performance.now();
      return {
        lines: totalLines,
        timeMs: t1 - t0
      };
    },

    /**
     * Streaming loader with string materialization.
     * Breaks V8 sliced string references to reduce memory.
     * Good for large files (<75M lines).
     * @param {File} file - The file to load
     * @param {Object} [options]
     * @param {number} [options.yieldEvery=10] - Yield to browser every N chunks
     * @returns {Promise<{lines: number, timeMs: number}>}
     */
    async streamMaterializedLoad(file, options = {}) {
      const yieldEvery = options.yieldEvery || 10;
      const t0 = performance.now();

      Model.lines = [];
      const decoder = new TextDecoder('utf-8');
      const reader = file.stream().getReader();
      let chunkCount = 0;
      let remainder = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lastNewlineIndex = text.lastIndexOf('\n');

          if (lastNewlineIndex !== -1) {
            const allLines = text.split('\n');
            const slicedLines = allLines.slice(0, -1);
            slicedLines[0] = remainder + slicedLines[0];
            remainder = allLines[allLines.length - 1];

            // Materialize strings to break V8 sliced string references
            const materializedLines = slicedLines.map(line => Array.from(line).join(''));
            _internals.appendLines(materializedLines, true);
          } else {
            remainder += text;
          }

          chunkCount++;
          if (chunkCount % yieldEvery === 0) {
            _internals.appendLines([], false);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        _internals.appendLines(remainder.length > 0 ? ['' + remainder] : [], false);
      } finally {
        reader.releaseLock();
      }

      const t1 = performance.now();
      return {
        lines: Model.lines.length,
        timeMs: t1 - t0
      };
    },

    /**
     * Streaming loader with GC hints.
     * Creates memory pressure to encourage garbage collection.
     * Best for very large files (<90M lines).
     * @param {File} file - The file to load
     * @param {Object} [options]
     * @param {number} [options.yieldEvery=10] - Yield to browser every N chunks
     * @param {number} [options.renderEvery=5] - Render every N chunks (within yieldEvery cycle)
     * @returns {Promise<{lines: number, timeMs: number}>}
     */
    async streamGcHintsLoad(file, options = {}) {
      const yieldEvery = options.yieldEvery || 10;
      const renderEvery = options.renderEvery || 5;
      const t0 = performance.now();

      Model.lines = [];
      const decoder = new TextDecoder('utf-8');
      const reader = file.stream().getReader();
      let chunkCount = 0;
      let remainder = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lastNewlineIndex = text.lastIndexOf('\n');

          if (lastNewlineIndex !== -1) {
            const allLines = text.split('\n');
            const slicedLines = allLines.slice(0, -1);
            slicedLines[0] = remainder + slicedLines[0];
            remainder = allLines[allLines.length - 1];

            // Materialize strings to break V8 sliced string references
            const materializedLines = slicedLines.map(line => Array.from(line).join(''));
            // Render periodically within yield cycle
            _internals.appendLines(materializedLines, chunkCount % yieldEvery !== renderEvery);
          } else {
            remainder += text;
          }

          chunkCount++;
          if (chunkCount % yieldEvery === 0) {
            // Create temporary memory pressure to hint GC
            const _ = new Array(100000);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        _internals.appendLines(remainder.length > 0 ? ['' + remainder] : [], false);
      } finally {
        reader.releaseLock();
      }

      const t1 = performance.now();
      return {
        lines: Model.lines.length,
        timeMs: t1 - t0
      };
    }
  };

  // Attach to vbuf instance
  vbuf.FileLoader = FileLoader;

  return FileLoader;
}
