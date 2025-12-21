<!--
  @fileoverview Svelte wrapper for Buffee editor
  @example
  <script>
    import BuffeeEditor from './svelte.svelte';
    let editor;

    function handleReady(e) {
      editor = e.detail;
      editor.Model.text = 'Hello, World!';
    }
  </script>

  <BuffeeEditor rows={10} theme="eva" on:ready={handleReady} />
-->

<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  /**
   * @type {number} Fixed number of visible lines
   */
  export let rows = undefined;

  /**
   * @type {number} Fixed number of text columns
   */
  export let cols = undefined;

  /**
   * @type {number} Spaces per tab
   */
  export let spaces = 4;

  /**
   * @type {string} Theme name (e.g., 'eva', 'nord', 'gruv')
   */
  export let theme = '';

  /**
   * @type {boolean} Show line numbers
   */
  export let showGutter = true;

  /**
   * @type {boolean} Position gutter on right side
   */
  export let gutterRight = false;

  /**
   * @type {boolean} Show status bar
   */
  export let showStatus = true;

  /**
   * @type {boolean} Position status bar at top
   */
  export let statusTop = false;

  /**
   * @type {string} Initial editor content
   */
  export let initialText = '';

  /**
   * @type {string} Additional CSS classes
   */
  let className = '';
  export { className as class };

  const dispatch = createEventDispatcher();

  let container;
  let editor = null;

  /**
   * Get the editor instance
   * @returns {Buffee|null}
   */
  export function getEditor() {
    return editor;
  }

  onMount(() => {
    if (!container || typeof Buffee === 'undefined') return;

    const config = { rows, cols, spaces };

    // Add status line callbacks if available
    if (showStatus && typeof BuffeeStatusLine !== 'undefined') {
      config.callbacks = BuffeeStatusLine(container);
    }

    editor = new Buffee(container, config);

    if (initialText) {
      editor.Model.text = initialText;
    }

    dispatch('ready', editor);
  });

  onDestroy(() => {
    if (editor && editor.destroy) {
      editor.destroy();
    }
    editor = null;
  });

  $: themeClass = theme ? `buffee-themepack1-${theme}` : '';
</script>

{#snippet statusBar()}
  <div class="buffee-status">
    <div class="buffee-status-left">
      <span class="buffee-linecount"></span>
    </div>
    <div class="buffee-status-right">
      Ln <span class="buffee-head-row"></span>, Col <span class="buffee-head-col"></span>
      <span class="buffee-status-divider">|</span>
      <span class="buffee-spaces"></span>
    </div>
  </div>
{/snippet}

<div
  bind:this={container}
  class="buffee {themeClass} {className}"
>
  <textarea class="buffee-clipboard-bridge" aria-hidden="true"></textarea>
  {#if showStatus && statusTop}{@render statusBar()}{/if}
  <div class="no-select buffee-elements">
    {#if showGutter && !gutterRight}
      <div class="buffee-gutter"></div>
    {/if}
    <div class="buffee-lines" tabindex="0">
      <blockquote class="buffee-layer-text"></blockquote>
      <div class="buffee-layer-elements"></div>
      <div class="buffee-cursor"></div>
    </div>
    {#if showGutter && gutterRight}
      <div class="buffee-gutter"></div>
    {/if}
  </div>
  {#if showStatus && !statusTop}{@render statusBar()}{/if}
</div>
