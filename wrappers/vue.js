/**
 * @fileoverview Vue 3 wrapper for Buffee editor
 * @example
 * <script setup>
 * import BuffeeEditor from './vue.js';
 * import { ref } from 'vue';
 *
 * const editorRef = ref(null);
 *
 * function handleReady(editor) {
 *   editor.Model.text = 'Hello, World!';
 * }
 * </script>
 *
 * <template>
 *   <BuffeeEditor ref="editorRef" :rows="10" theme="eva" @ready="handleReady" />
 * </template>
 */

import { defineComponent, ref, onMounted, onUnmounted, h, watch } from 'vue';

/**
 * Vue 3 component wrapper for Buffee editor.
 */
const BuffeeEditor = defineComponent({
  name: 'BuffeeEditor',

  props: {
    /** Fixed number of visible lines */
    rows: { type: Number, default: undefined },
    /** Fixed number of text columns */
    cols: { type: Number, default: undefined },
    /** Spaces per tab */
    spaces: { type: Number, default: 4 },
    /** Theme name (e.g., 'eva', 'nord', 'gruv') */
    theme: { type: String, default: '' },
    /** Show line numbers */
    showGutter: { type: Boolean, default: true },
    /** Position gutter on right side */
    gutterRight: { type: Boolean, default: false },
    /** Show status bar */
    showStatus: { type: Boolean, default: true },
    /** Position status bar at top */
    statusTop: { type: Boolean, default: false },
    /** Initial editor content */
    initialText: { type: String, default: '' }
  },

  emits: ['ready'],

  setup(props, { emit, expose }) {
    const container = ref(null);
    const editor = ref(null);

    // Expose editor instance
    expose({ getEditor: () => editor.value });

    onMounted(() => {
      if (!container.value || typeof Buffee === 'undefined') return;

      const config = {
        rows: props.rows,
        cols: props.cols,
        spaces: props.spaces
      };

      let ed = new Buffee(container.value, config);

      // Add status line extension if available
      if (props.showStatus && typeof BuffeeStatusLine !== 'undefined') {
        ed = BuffeeStatusLine(ed);
      }

      editor.value = ed;

      if (props.initialText) {
        editor.value.Model.text = props.initialText;
      }

      emit('ready', editor.value);
    });

    onUnmounted(() => {
      if (editor.value && editor.value.destroy) {
        editor.value.destroy();
      }
      editor.value = null;
    });

    return { container, editor };
  },

  render() {
    const themeClass = this.theme ? `buffee-themepack1-${this.theme}` : '';

    const statusBar = this.showStatus ? h('div', { class: 'buffee-status' }, [
      h('div', { class: 'buffee-status-left' }, [
        h('span', { class: 'buffee-linecount' })
      ]),
      h('div', { class: 'buffee-status-right' }, [
        'Ln ',
        h('span', { class: 'buffee-head-row' }),
        ', Col ',
        h('span', { class: 'buffee-head-col' }),
        h('span', { class: 'buffee-status-divider' }, '|'),
        h('span', { class: 'buffee-spaces' })
      ])
    ]) : null;

    const gutter = this.showGutter ? h('div', { class: 'buffee-gutter' }) : null;

    return h('div', {
      ref: 'container',
      class: `buffee ${themeClass}`.trim()
    }, [
      h('textarea', { class: 'buffee-clipboard-bridge', 'aria-hidden': 'true' }),
      this.statusTop ? statusBar : null,
      h('div', { class: 'no-select buffee-elements' }, [
        !this.gutterRight ? gutter : null,
        h('div', { class: 'buffee-lines', tabindex: 0 }, [
          h('blockquote', { class: 'buffee-layer-text' }),
          h('div', { class: 'buffee-layer-elements' }),
          h('div', { class: 'buffee-cursor' })
        ]),
        this.gutterRight ? gutter : null
      ]),
      !this.statusTop ? statusBar : null
    ]);
  }
});

export { BuffeeEditor };
export default BuffeeEditor;
