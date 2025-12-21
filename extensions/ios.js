/**
 * @fileoverview BuffeeIOS - iOS/touch support extension for Buffee.
 * Enables touch interactions and on-screen keyboard input on iOS devices.
 * @version 1.0.0
 */

/**
 * Initializes iOS support extension for a Buffee instance.
 *
 * @param {Buffee} editor - The Buffee instance to extend
 * @returns {Object} The iOS API object
 */
function BuffeeIOS(editor) {
  const { $e } = editor._internals;
  const lineHeight = editor.lineHeight;
  const { Selection } = editor;

  const editingArea = $e.querySelector('.buffee-lines');
  const editorElement = $e;

  // Use contenteditable so tapping opens the keyboard
  editingArea.setAttribute('contenteditable', 'true');
  editingArea.setAttribute('role', 'textbox');
  editingArea.setAttribute('aria-multiline', 'true');
  editingArea.setAttribute('spellcheck', 'false');
  editingArea.setAttribute('autocapitalize', 'off');
  editingArea.setAttribute('autocorrect', 'off');
  editingArea.setAttribute('inputmode', 'text');

  // Hidden textarea "input sink" for capturing iOS keyboard input
  const sink = document.createElement('textarea');
  sink.setAttribute('autocapitalize', 'off');
  sink.setAttribute('autocorrect', 'off');
  sink.setAttribute('spellcheck', 'false');
  Object.assign(sink.style, {
    position: 'fixed',
    opacity: 0,
    left: '0',
    top: '0',
    height: '1px',
    width: '1px',
  });

  // Sentinel characters for detecting backspace on iOS
  const L = '\u200B'; // left sentinel (zero-width space)
  const R = '\u200B'; // right sentinel
  sink.value = L + R;
  document.body.appendChild(sink);

  function resetSink() {
    sink.value = L + R;
    sink.selectionStart = sink.selectionEnd = 1; // caret between L and R
  }

  // Measure 1ch width using the editor's font
  function measureChWidth() {
    const probe = document.createElement('span');
    probe.textContent = '0';
    const cs = getComputedStyle(editingArea);
    probe.style.font = cs.font;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    probe.style.whiteSpace = 'pre';
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    return w;
  }

  let ch = measureChWidth();
  // Recompute on font changes / resize
  new ResizeObserver(() => { ch = measureChWidth(); }).observe(editingArea);

  function getPoint(evt) {
    const rect = editingArea.getBoundingClientRect();
    const touch = evt.changedTouches?.[0] ?? evt.touches?.[0];
    const clientX = touch ? touch.clientX : evt.clientX;
    const clientY = touch ? touch.clientY : evt.clientY;
    const x = (clientX - rect.left) + editingArea.scrollLeft;
    const y = (clientY - rect.top) + editingArea.scrollTop;
    const cs = getComputedStyle(editingArea);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    return { x: x - padL, y: y - padT };
  }

  function setCursor(evt) {
    const { x, y } = getPoint(evt);
    const row = Math.max(0, Math.floor(y / lineHeight));
    const col = Math.max(0, Math.floor(x / ch));
    if (Selection.iosSetCursorAndRender) {
      Selection.iosSetCursorAndRender({ row, col });
    }
  }

  // Dispatch synthetic keydown to the editor
  function synthKeydown(key) {
    const ev = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      code: key.length === 1 ? ('Key' + key.toUpperCase()) : key
    });
    editorElement.dispatchEvent(ev);
  }

  // Map beforeinput events to synthetic keydowns
  sink.addEventListener('beforeinput', (e) => {
    e.preventDefault();

    if (e.inputType === 'insertText') {
      for (const char of e.data || '') synthKeydown(char);
    } else if (e.inputType === 'deleteContentBackward') {
      synthKeydown('Backspace');
    } else if (e.inputType === 'insertLineBreak') {
      synthKeydown('Enter');
    }
    resetSink();
  });

  // Handle IME/dictation
  sink.addEventListener('compositionend', (e) => {
    if (e.data) {
      for (const char of e.data) synthKeydown(char);
    }
  });

  // Focus sink on tap to show iOS keyboard
  editorElement.addEventListener('pointerdown', (e) => {
    sink.focus({ preventScroll: true });
    setCursor(e);
  });

  // Public API
  const iOS = {
    /**
     * Gets the hidden input sink element.
     * @returns {HTMLTextAreaElement}
     */
    get sink() { return sink; },

    /**
     * Manually focus the input sink to show keyboard.
     */
    focus() {
      sink.focus({ preventScroll: true });
    },

    /**
     * Cleanup and remove iOS support.
     */
    destroy() {
      sink.remove();
      editingArea.removeAttribute('contenteditable');
      editingArea.removeAttribute('role');
      editingArea.removeAttribute('aria-multiline');
    }
  };

  // Attach to editor instance
  editor.iOS = iOS;

  return iOS;
}
