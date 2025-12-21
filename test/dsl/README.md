# Test DSL - Domain Specific Language

## Introduction

**Goal:** Describe all test specs in a high-level natural language-like DSL without all the syntactical artifacts of a programming language.

### User Prompt
> "Earlier in the test walkthrough, you derived a natural language summary of the corresponding spec code. I was thinking in the same lines of having a DSL and specifying the spec in plaintext"
>
> "Yes. Let's walk through some examples of the declarative specs first."
>
> "Let's name each of your examples as 'Proposals'. Dump them out to a file test/dsl.org. I want us to iterate on the DSL together and capture the evolution of the DSL. Also DSL.org, add a short intro that I want to describe all the test specs in a high-level natural language like DSL without all the syntical artifacts of a programming language. Include this prompt in the dsl.org"

---

## Version History

### v4.2.0 - Full case-insensitivity for EXPECT commands

**Enhancement:** The entire EXPECT command is now fully case-insensitive, not just the `EXPECT` keyword.

**Previously (v4.0.0-v4.1.0):** Only the `EXPECT` keyword was case-insensitive.

**Now:** The entire command including `selection at` and `cursor at` can be written in any case.

**Valid variations:**
```
EXPECT cursor at 0,5
expect cursor at 0,5
Expect Cursor At 0,5
EXPECT CURSOR AT 0,5

EXPECT selection at 0,0-0,5
expect selection at 0,0-0,5
Expect Selection At 0,0-0,5
EXPECT SELECTION AT 0,0-0,5
```

**Normalized form:** Still uses uppercase for consistency:
```
EXPECT cursor at 0,5
EXPECT selection at 0,0-0,5
```

---

### v4.1.0 - EXPECT selection at

**Syntax:** `EXPECT selection at <startRow>,<startCol>-<endRow>,<endCol>`

Verifies that there is an active selection with the specified start and end coordinates.

**Features:**
- Normalized form uses uppercase: `EXPECT selection at`
- Implicitly verifies a selection exists (no need for separate isSelection check)
- Case-insensitive keyword `EXPECT` (full case-insensitivity added in v4.2.0)

**Example:**
```
TYPE "Hello World"
left with meta
right 5 times with shift
EXPECT selection at 0,0-0,5
```

**Transpiles to:**
```javascript
fixture.type('Hello World');
fixture.press(Key.ArrowLeft).withMetaKey().once();
fixture.press(Key.ArrowRight).withShiftKey().times(5);
expect(fixture).toHaveSelectionAt(0, 0, 0, 5);
```

---

### v4.0.0 - EXPECT cursor at

**Syntax:** `EXPECT cursor at <row>,<col>`

Verifies that the selection is a cursor (not a selection) at the specified coordinates.

**Features:**
- Normalized form uses uppercase: `EXPECT cursor at`
- Implicitly verifies it's a cursor, not a selection (no need for separate isSelection check)
- Case-insensitive keyword `EXPECT` (full case-insensitivity added in v4.2.0)

**Example:**
```
TYPE "Hello"
left 2 times
EXPECT cursor at 0,3
```

**Transpiles to:**
```javascript
fixture.type('Hello');
fixture.press(Key.ArrowLeft).times(2);
expect(fixture).toHaveCursorAt(0, 3);
```

---

### v3.1.0 - JavaScript inline comment limitation

**Limitation:** JavaScript inline comments (`//`) after statements are not supported.

**Rationale:** The DSL identifies JavaScript lines by checking if they end with `;`. Lines with inline comments end with comment text, not `;`, breaking this rule.

**Workaround:** Use standalone comment lines. Lines where the trimmed content starts with `//` are classified as JavaScript and passed through directly (leading whitespace is permitted).

**Example:**
```
// Standalone comments work
  // Indented comments also work
TYPE "Hello"
const text = fixture.editor.Model.lines[0];  // This inline comment will NOT work
expect(text).toBe("Hello");
```

---

### v3.0.0 - Toolchain definition

**Goal:** Define the concrete toolchain for processing DSL.

#### Toolchain Proposals

1. **Parser** - How to parse DSL → AST?
2. **Transpiler** - DSL → JavaScript conversion?
3. **Interpreter** - Direct execution?
4. **Integration** - How it hooks into the test framework?
5. **File format** - `.dsl` extension, where files live?
6. **Build process** - When/how DSL is processed?

#### User Decision

**Approach: Transpilation**

The DSL will be transpiled to JavaScript, not interpreted directly.

---

### v2.2.0 - Disambiguate semicolon

**Rule:** `PRESS ;` is ambiguous (conflicts with JavaScript line ending). Semicolon must be single-quoted: `PRESS ';'`

**Example:**
```
PRESS ';'
PRESS ';' 3 times
```

---

### v2.1.0 - Empty lines allowed

**Rule:** Empty lines are allowed between statements for readability.

**Example:**
```
TYPE "Hello"

const text = fixture.editor.Model.lines[0];
expect(text).toBe("Hello");

backspace 5 times

expect(fixture.editor.Model.lines[0]).toBe("");
```

---

### v2.0.0 - JavaScript interweaving

**Major change:** DSL can be interwoven with JavaScript code.

**Rule:** Any line ending with `;` is interpreted as JavaScript, not DSL.

**Example:**
```
TYPE "Hello"
const text = fixture.editor.Model.lines[0];
expect(text).toBe("Hello");
backspace 5 times
expect(fixture.editor.Model.lines[0]).toBe("");
```

This allows complex assertions and logic to coexist with natural language DSL commands.

---

### v1.6.0 - Normalized forms

**Rules:**
1. Special keys are lowercase (`backspace`, `enter`, `left`)
2. Exclude `press` keyword for special keys only (keep `PRESS` for single characters)
3. Use arrow shortcuts (`left`, `right`, `up`, `down`)
4. Standard order: `<key> <quantification> <qualification>`
5. Action keywords are capitalized (`PRESS`, `TYPE`)
6. `TYPE` strings use double quotes; escape sequences follow JavaScript
7. `PRESS` character omits single quotes around the character
8. When both `meta` and `shift` are specified, `meta` always comes before `shift`

**Example:**
```
PRESS a
PRESS a 3 times
TYPE "hello world"
TYPE "hello\nworld"
TYPE "say \"hello\""
backspace
backspace 5 times
enter once
left with meta
right 5 times with shift
right with meta, shift
```

---

### v1.5.0 - Case insensitive special keys

**Syntax:** Special keys (Backspace, Enter, ArrowLeft, Left, etc.) are case insensitive

**Example:**
```
backspace
BACKSPACE 5 times
enter once
LEFT with meta
right 5 times with SHIFT
```

---

### v1.4.0 - Omit "press" for special keys

**Syntax:** The `press` keyword can be omitted for Backspace, Enter, and arrow keys

**Example:**
```
Backspace
Backspace 5 times
Enter once
left with meta
right 5 times with shift
```

---

### v1.3.0 - Arrow shortcuts

**Syntax:** Arrow keys support short forms: `left`, `right`, `up`, `down`

**Example:**
```
press right with shift
press left 5 times with meta
press right 5 times with shift
```

---

### v1.2.0 - Qualifications

**Syntax:** `press <key> [quantification] [with <modifiers>]`

**Example:**
```
press ArrowRight with shift
press ArrowLeft 5 times with meta
```

---

### v1.1.0 - Quantification

**Syntax:** `press <key> [N time(s)|once]`

**Example:**
```
press Backspace 5 times
press Enter once
press a 3 times
```

---

### v1.0.0 - Basic keypress

**Syntax:** `press <key>`

**Example:**
```
press a
press Backspace
press Enter
```

---

## Syntax Reference

### Single Keypress

**Base predicate:** `press <key>`

Represents a single keypress.

#### Valid key formats:
- `press a` - unquoted single character
- `press 'a'` - single-quoted single character
- `press Backspace` - key constant (unquoted)
- `press Enter` - key constant (unquoted)
- `press ArrowLeft` or `press left` - arrow key (verbose or short form)
- `press ArrowRight` or `press right` - arrow key (verbose or short form)
- `press ArrowUp` or `press up` - arrow key (verbose or short form)
- `press ArrowDown` or `press down` - arrow key (verbose or short form)

#### Invalid:
- ~~`press "a"`~~ - double quotes not allowed for keys

### Quantification

The number of times a key is pressed can be specified after the key.

**Pattern:** `press <key> [N time(s)|once]`

#### Examples:
- `press a` - once (implicit)
- `press a once` - once (explicit)
- `press a 1 time` - once
- `press a 3 times` - three times
- `press Backspace 5 times` - five times
- `press Enter 1 time` - once

If quantification is not specified, the key is pressed **once**.

### Qualifications

Modifiers can be applied to keypresses using `with` clause.

**Pattern:** `press <key> [quantification] [with <modifiers>]` or `press <key> [with <modifiers>] [quantification]`

Order does not matter - quantification and modifiers can appear in any order.

#### Supported modifiers:
- `shift` - Shift key modifier
- `meta` - Meta/Command key modifier

#### Examples:
- `press right with shift` - shift + arrow right, once
- `press left with meta` - meta + arrow left, once
- `press right 5 times with shift` - shift + arrow right, five times
- `press right with shift 5 times` - shift + arrow right, five times (same as above)
- `press a with meta` - meta + 'a', once
- `press right with shift, meta` - shift + meta + arrow right
- `press right with meta, shift` - meta + shift + arrow right

---

## Transpiler

A transpiler that converts natural language test DSL to JavaScript code.

### Overview

The transpiler implements the DSL specification v4.2.0:
- v1.6.0 normalized forms
- v2.0.0 JavaScript interweaving (lines ending with `;`)
- v2.1.0 empty lines allowed
- v2.2.0 semicolon disambiguation
- v3.0.0 toolchain definition
- v3.1.0 inline comment limitation
- v4.0.0 EXPECT cursor at command
- v4.1.0 EXPECT selection at command
- v4.2.0 full case-insensitivity for EXPECT commands

### Usage

```javascript
const transpiler = new DSLTranspiler();
const jsCode = transpiler.transpileLine(dslLine);
```

For complete spec generation:
```javascript
const generator = new SpecGenerator(transpiler);
const generatedSpec = generator.generate(dslSource);
```

### Example

**Input DSL:**
```
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "X"
expect(fixture).toHaveLines('XWorld');
```

**Output JavaScript:**
```javascript
fixture.type('Hello World');
fixture.press(Key.ArrowLeft).withMetaKey().once();
fixture.press(Key.ArrowRight).withShiftKey().times(5);
fixture.type('X');
expect(fixture).toHaveLines('XWorld');
```

### Supported Commands

#### TYPE
```
TYPE "text"  →  fixture.type('text');
```

#### PRESS (single characters)
```
PRESS a      →  fixture.press('a').once();
PRESS " "    →  fixture.press(' ').once();
PRESS ';'    →  fixture.press(';').once();
```

#### EXPECT cursor at
```
EXPECT cursor at <row>,<col>  →  expect(fixture).toHaveCursorAt(row, col);
```

Verifies that the selection is a cursor (not a selection) at the specified coordinates. Fully case-insensitive (v4.2.0).

Examples:
```
EXPECT cursor at 0,5     →  expect(fixture).toHaveCursorAt(0, 5);
EXPECT cursor at 2, 10   →  expect(fixture).toHaveCursorAt(2, 10);
expect cursor at 0,5     →  expect(fixture).toHaveCursorAt(0, 5);  // also valid
```

#### EXPECT selection at
```
EXPECT selection at <startRow>,<startCol>-<endRow>,<endCol>  →  expect(fixture).toHaveSelectionAt(startRow, startCol, endRow, endCol);
```

Verifies that there is an active selection with the specified start and end coordinates. Fully case-insensitive (v4.2.0).

Examples:
```
EXPECT selection at 0,0-0,5       →  expect(fixture).toHaveSelectionAt(0, 0, 0, 5);
EXPECT selection at 1, 2 - 4, 5   →  expect(fixture).toHaveSelectionAt(1, 2, 4, 5);
expect selection at 0,0-0,5       →  expect(fixture).toHaveSelectionAt(0, 0, 0, 5);  // also valid
```

#### Special Keys
```
backspace                   →  fixture.press(Key.Backspace).once();
backspace 5 times           →  fixture.press(Key.Backspace).times(5);
enter                       →  fixture.press(Key.Enter).once();
left                        →  fixture.press(Key.ArrowLeft).once();
right with shift            →  fixture.press(Key.ArrowRight).withShiftKey().once();
up 2 times                  →  fixture.press(Key.ArrowUp).times(2);
down with meta, shift       →  fixture.press(Key.ArrowDown).withMetaKey().withShiftKey().once();
```

#### JavaScript Pass-through

Any line ending with `;` or starting with `//` is treated as JavaScript and passed through unchanged:

```
const text = fixture.editor.Model.lines[0];
expect(text).toBe("Hello");
// This is a comment
```

#### Empty Lines

Empty lines are preserved for readability.

### Implementation

The transpiler is a simple line-by-line processor:
1. Detects line type (JavaScript, empty, DSL command)
2. Parses DSL commands using regex patterns
3. Generates corresponding JavaScript code

See `test/dsl/transpiler.js` for implementation details.

---

## Examples

### Basic Typing

#### 1. Insert single character 'a'
```
PRESS a
expect(fixture).toHaveLines('a');
const [firstEdge, SecondEdge] = fixture.editor.Selection.ordered;
expect(firstEdge).toEqual({ row: 0, col: 1 });
expect(SecondEdge).toEqual({ row: 0, col: 1 });
```

#### 2. Insert 'Hello'
```
TYPE "Hello"
expect(fixture).toHaveLines('Hello');
const [firstEdge, SecondEdge] = fixture.editor.Selection.ordered;
expect(firstEdge).toEqual({ row: 0, col: 5 });
expect(SecondEdge).toEqual({ row: 0, col: 5 });
```

#### 3. Insert 'Hello World' with spaces
```
TYPE "Hello World"
expect(fixture).toHaveLines('Hello World');
```

#### 4. Insert sentence 'The quick brown fox'
```
TYPE "The quick brown fox"
expect(fixture).toHaveLines('The quick brown fox');
```

### Replacing Selections

#### 1. Replace 'Hello ' with 'X'
```
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "X"

expect(fixture.editor.Selection.isSelection).toBe(false);
expect(fixture).toHaveLines('XWorld');
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 1 });
expect(end).toEqual({ row: 0, col: 1 });
```

#### 2. Replace 'Hello ' with 'Goodbye'
```
TYPE "Hello World"
left with meta
right 5 times with shift
TYPE "Goodbye"

expect(fixture.editor.Selection.isSelection).toBe(false);
expect(fixture).toHaveLines('GoodbyeWorld');
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 7 });
expect(end).toEqual({ row: 0, col: 7 });
```

#### 3. Replace entire line
```
TYPE "Old text"
left with meta
right with meta, shift
TYPE "New"

expect(fixture.editor.Selection.isSelection).toBe(false);
expect(fixture).toHaveLines('New');
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 3 });
expect(end).toEqual({ row: 0, col: 3 });
```

#### 4. Replace multi-line selection with 'X'
```
TYPE "First line"
enter
TYPE "Second line"
enter
TYPE "Third line"

up 2 times
left with meta
down 2 times with shift
TYPE "X"

expect(fixture.editor.Selection.isSelection).toBe(false);
expect(fixture).toHaveLines('Xhird line');
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 1 });
expect(end).toEqual({ row: 0, col: 1 });
```

#### 5. Replace partial multi-line with text
```
TYPE "First line"
enter
TYPE "Second line"
enter
TYPE "Third line"

up 2 times
left with meta
right 6 times
down 2 times with shift
TYPE "REPLACED"

expect(fixture.editor.Selection.isSelection).toBe(false);
expect(fixture).toHaveLines('First REPLACEDine');
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 14 });
expect(end).toEqual({ row: 0, col: 14 });
```

#### 6. Replace backward selection
```
TYPE "Hello World"
left 5 times with shift
TYPE "Everyone"

expect(fixture.editor.Selection.isSelection).toBe(false);
expect(fixture).toHaveLines('Hello Everyone');
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 14 });
expect(end).toEqual({ row: 0, col: 14 });
```

#### 7. Replace 'World' with space
```
TYPE "HelloWorld"
left with meta
right 5 times
right 5 times with shift
PRESS " "

expect(fixture.editor.Selection.isSelection).toBe(false);
expect(fixture).toHaveLines('Hello ');
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 6 });
expect(end).toEqual({ row: 0, col: 6 });
```

---

## Original Proposals (Claude's)

### Proposal 1: Simple typing

**Current (Imperative):**
```javascript
fixture.type('Hello');
fixture.press(Key.Backspace).once();
expect(fixture).toHaveLines('Hell');
```

**Declarative:**
```
type "Hello"
press Backspace
expect lines ["Hell"]
```

---

### Proposal 2: Multiple repetitions

**Current (Imperative):**
```javascript
fixture.type('Hello');
fixture.press(Key.Backspace).times(3);
expect(fixture).toHaveLines('He');
```

**Declarative:**
```
type "Hello"
press Backspace 3 times
expect lines ["He"]
```

---

### Proposal 3: Navigation with modifiers

**Current (Imperative):**
```javascript
fixture.type('Hello');
fixture.press(Key.ArrowLeft).withMetaKey().once();
expect(fixture).toHaveLines('Hello');
```

**Declarative:**
```
type "Hello"
press Meta+ArrowLeft
expect lines ["Hello"]
```

---

### Proposal 4: Selection with shift

**Current (Imperative):**
```javascript
fixture.press(Key.ArrowRight).withShiftKey().times(5);
const [start, end] = fixture.editor.Selection.ordered;
expect(start).toEqual({ row: 0, col: 0 });
expect(end).toEqual({ row: 0, col: 5 });
```

**Declarative:**
```
press Shift+ArrowRight 5 times
expect selection from (0, 0) to (0, 5)
```

---

### Proposal 5: Multi-line editing

**Current (Imperative):**
```javascript
fixture.type('First');
fixture.press(Key.Enter).once();
fixture.type('Second');
expect(fixture).toHaveLines('First', 'Second');
```

**Declarative:**
```
type "First"
press Enter
type "Second"
expect lines ["First", "Second"]
```
