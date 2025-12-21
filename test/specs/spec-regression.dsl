# Walkthrough feature - regression tests

## should demonstrate interleaved success and failure expects
### Interleaved success/fail expects for walkthrough testing
TYPE "First line"
// Intentional fail for walkthrough demo
expect(1).toEqual(null);
enter
// Intentional success for walkthrough demo
expect(1).toBe(1);
TYPE "Second line"
// Intentional fail for walkthrough demo
expect(1).toBe(3);
left with meta
// Intentional success for walkthrough demo
expect(5).toBe(5);


# DSL regression tests

## should position cursor correctly after multi-char selection replacement
### Replacing selection with multi-char text should position cursor correctly
TYPE "Hello world"
left 5 times with shift
fixture.editor.Selection.insert('REPLACED');
expect(fixture).toHaveLines('Hello REPLACED');
EXPECT cursor at 0,14

## should handle pressing semicolon
### PRESS ';' should produce ';'
PRESS ';'
expect(fixture).toHaveLines(';');
EXPECT cursor at 0,1

## should handle pressing semicolon multiple times
### PRESS ';' 3 times should produce ';;;'
PRESS ';' 3 times
expect(fixture).toHaveLines(';;;');
EXPECT cursor at 0,3

