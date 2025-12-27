# Samples

Copy-paste patterns for common use cases. See `_template.html` for full boilerplate.

## Minimal Editor Container

```html
<div class="buffee buffee-themepack1-boring" id="editor">
  <textarea class="buffee-clipboard-bridge"></textarea>
  <div class="no-select buffee-elements">
    <div class="buffee-gutter"></div>
    <div class="buffee-lines" tabindex="0"><blockquote class="buffee-layer-text"></blockquote><div class="buffee-layer-elements"></div><div class="buffee-cursor"></div></div>
  </div>
  <div class="buffee-status">
    <div class="buffee-status-left"><span class="buffee-linecount"></span></div>
    <div class="buffee-status-right">
      Ln <span class="buffee-head-row"></span>, Col <span class="buffee-head-col"></span>
      <span class="buffee-status-divider">|</span>
      <span class="buffee-spaces"></span>
    </div>
  </div>
</div>
```

## Basic Init

```javascript
const el = document.getElementById('editor');
const editor = BuffeeStatusLine(new Buffee(el));
editor.Model.text = 'Hello, World!';
```

## Fixed Size

```javascript
new Buffee(el, { rows: 25, cols: 80 });
```

## With Syntax Highlighting

```html
<script src="extensions/syntax.js"></script>
```
```javascript
BuffeeSyntax(editor);
editor.Syntax.setLanguage('javascript');
editor.Syntax.enabled = true;
```

## With TUI Elements

```html
<script src="extensions/tui.js"></script>
```
```javascript
BuffeeTUI(editor);
editor.TUI.addButton({ row: 0, col: 0, label: 'Click Me', onActivate: () => alert('!') });
editor.TUI.enabled = true;
```

## Read-Only Mode

```javascript
editor.editMode = 'navigate';  // Can scroll, no editing
editor.editMode = 'read';      // No interaction (for TUI)
```

## File Index

| File | Shows |
|------|-------|
| `sample-basic` | Minimal editable editor |
| `sample-sizing` | Fixed rows/cols options |
| `sample-gutter-status` | Line numbers and status bar |
| `sample-readonly` | Navigate and read modes |
| `sample-syntax` | Syntax highlighting |
| `sample-tui` | TUI buttons/prompts |
| `sample-elementals` | DOM overlay elements |
| `sample-ios` | iOS touch support |
| `sample-loader` | Large file loading |
| `sample-movie` | ASCII animation |
| `sample-matrix` | Matrix rain effect |
| `sample-conway` | Game of Life |
