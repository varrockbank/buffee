# Basic Typing

## should insert single character
### Insert single character 'a'
PRESS a
expect(fixture).toHaveLines('a');
EXPECT cursor at 0,1

## should insert word 'Hello'
### Insert 'Hello'
TYPE "Hello"
expect(fixture).toHaveLines('Hello');
EXPECT cursor at 0,5

## should insert phrase with spaces
### Insert 'Hello World' with spaces
TYPE "Hello World"
expect(fixture).toHaveLines('Hello World');

## should insert sentence
### Insert sentence 'The quick brown fox'
TYPE "The quick brown fox"
expect(fixture).toHaveLines('The quick brown fox');


# Backspace

## should delete single character
### Delete single char from 'Hello' → 'Hell'
TYPE "Hello"
backspace
expect(fixture).toHaveLines('Hell');

## should delete multiple characters
### Delete 3 chars from 'Hello' → 'He'
TYPE "Hello"
backspace 3 times
expect(fixture).toHaveLines('He');

## should delete all characters leaving empty line
### Delete all chars from 'Hi' → ''
TYPE "Hi"
backspace 2 times
expect(fixture).toHaveLines('');

## should delete from middle of text
### Delete from middle: 'Hello' → 'Helo'
TYPE "Hello"
left 2 times
backspace
expect(fixture).toHaveLines('Helo');
EXPECT cursor at 0,2

## should delete multiple characters from middle
### Delete 2 chars from middle
TYPE "Hello World"
left 6 times
backspace 2 times
expect(fixture).toHaveLines('Hel World');
EXPECT cursor at 0,3

## should stop at line start when backspacing
### Backspace beyond line start
TYPE "Hi"
backspace 5 times
expect(fixture).toHaveLines('');
EXPECT cursor at 0,0


# Enter Key

## should create new line
### Create new line: 'Hello'[Enter] → 2 lines
TYPE "Hello"
enter
expect(fixture).toHaveLines('Hello', '');

## should create multiple lines
### Create multiple lines: 'Line 1'[Enter]'Line 2'[Enter]'Line 3' → 3 lines
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
expect(fixture).toHaveLines('Line 1', 'Line 2', 'Line 3');

## should split line at cursor position
### Split line: 'Hello'[ArrowLeft×2][Enter] → 'Hel' and 'lo'
TYPE "Hello"
left
left
enter
expect(fixture).toHaveLines('Hel', 'lo');

## should create new line at end of file
### Enter at end of file creates new line
TYPE "First line"
enter
TYPE "Second line"
enter
expect(fixture).toHaveLines('First line', 'Second line', '');
EXPECT cursor at 2,0

## should create multiple empty lines
### Create multiple empty lines from empty document
enter 5 times
expect(fixture).toHaveLines('', '', '', '', '', '');
EXPECT cursor at 5,0


# Complex Sequences

## should handle type, delete, retype sequence
### Type, delete, retype
TYPE "Hello"
backspace 2 times
TYPE "y there"
expect(fixture).toHaveLines('Hely there');

## should create and delete line breaks
### Create/delete line breaks
TYPE "Hello"
enter
TYPE "World"
backspace 6 times
expect(fixture).toHaveLines('Hello');

## should support multi-line editing
### Multi-line editing
TYPE "First"
enter
TYPE "Second"
up
TYPE " Line"
expect(fixture).toHaveLines('First Line', 'Second');

## should delete across line boundaries
### Delete across boundaries
TYPE "Hello"
enter
TYPE "World"
left with meta
backspace
expect(fixture).toHaveLines('HelloWorld');
EXPECT cursor at 0,5

## should edit at end of middle line
### Edit at end of middle line
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
up
TYPE " edited"
expect(fixture).toHaveLines('Line 1', 'Line 2 edited', 'Line 3');

## should edit at middle of middle line
### Edit at middle of middle line
TYPE "Line 1"
enter
TYPE "Line 2"
enter
TYPE "Line 3"
up
left with meta
right 3 times
TYPE "X"
expect(fixture).toHaveLines('Line 1', 'LinXe 2', 'Line 3');


# NewLine with selection

## should replace selection with newline
### NewLine with selection deletes selection and inserts newline
TYPE "ABC"
left 2 times
left with shift
enter
expect(fixture).toHaveLines("", "BC");
EXPECT cursor at 1,0

