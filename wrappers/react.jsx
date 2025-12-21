/**
 * @fileoverview React wrapper for Buffee editor
 * @example
 * import { BuffeeEditor } from './react.jsx';
 *
 * function App() {
 *   const editorRef = useRef(null);
 *
 *   useEffect(() => {
 *     if (editorRef.current) {
 *       editorRef.current.Model.text = 'Hello, World!';
 *     }
 *   }, []);
 *
 *   return <BuffeeEditor ref={editorRef} rows={10} theme="eva" />;
 * }
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

/**
 * React component wrapper for Buffee editor.
 * @param {Object} props
 * @param {number} [props.rows] - Fixed number of visible lines
 * @param {number} [props.cols] - Fixed number of text columns
 * @param {number} [props.spaces=4] - Spaces per tab
 * @param {string} [props.theme] - Theme name (e.g., 'eva', 'nord', 'gruv')
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showGutter=true] - Show line numbers
 * @param {boolean} [props.showStatus=true] - Show status bar
 * @param {string} [props.initialText] - Initial editor content
 * @param {Function} [props.onReady] - Callback when editor is initialized
 */
const BuffeeEditor = forwardRef(function BuffeeEditor(props, ref) {
  const {
    rows,
    cols,
    spaces = 4,
    theme,
    className = '',
    showGutter = true,
    gutterRight = false,
    showStatus = true,
    statusTop = false,
    initialText = '',
    onReady
  } = props;

  const containerRef = useRef(null);
  const editorRef = useRef(null);

  // Expose editor instance via ref
  useImperativeHandle(ref, () => editorRef.current, []);

  useEffect(() => {
    if (!containerRef.current || typeof Buffee === 'undefined') return;

    const el = containerRef.current;
    const config = { rows, cols, spaces };

    // Add status line callbacks if available
    if (showStatus && typeof BuffeeStatusLine !== 'undefined') {
      config.callbacks = BuffeeStatusLine(el);
    }

    const editor = new Buffee(el, config);
    editorRef.current = editor;

    if (initialText) {
      editor.Model.text = initialText;
    }

    if (onReady) {
      onReady(editor);
    }

    return () => {
      // Cleanup if Buffee has a destroy method
      if (editor.destroy) {
        editor.destroy();
      }
      editorRef.current = null;
    };
  }, [rows, cols, spaces]);

  const themeClass = theme ? `buffee-themepack1-${theme}` : '';

  const statusBar = showStatus && (
    <div className="buffee-status">
      <div className="buffee-status-left">
        <span className="buffee-linecount" />
      </div>
      <div className="buffee-status-right">
        Ln <span className="buffee-head-row" />, Col <span className="buffee-head-col" />
        <span className="buffee-status-divider">|</span>
        <span className="buffee-spaces" />
      </div>
    </div>
  );

  const gutter = showGutter && <div className="buffee-gutter" />;

  return (
    <div
      ref={containerRef}
      className={`buffee ${themeClass} ${className}`.trim()}
    >
      <textarea className="buffee-clipboard-bridge" aria-hidden="true" />
      {statusTop && statusBar}
      <div className="no-select buffee-elements">
        {!gutterRight && gutter}
        <div className="buffee-lines" tabIndex={0}>
          <blockquote className="buffee-layer-text" />
          <div className="buffee-layer-elements" />
          <div className="buffee-cursor" />
        </div>
        {gutterRight && gutter}
      </div>
      {!statusTop && statusBar}
    </div>
  );
});

export { BuffeeEditor };
export default BuffeeEditor;
