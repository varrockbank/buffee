# Performance

This documents profiles performance and documents R&D decisions.

This project has 3 pillars of performance

1. network payload size
2. How responsive the editor is 
3. capacity (how large of files we can load)

At the time of writing, the network payload size is ~3KB 
and the responsive is in <20ms. 

We will see how far we can push the capacity limit.
Eventually, but in the distant edge cases, responsiveness will degrade.
In fact, we may even see issues of correctness.

We want to profile the behavior at that boundary, perhaps study 
solutions, which informs our design decision, but not necessarily dictate it.
In simpler terms, we may discover that it's possible to handle mega large files with some tweaks but the trade-off to the vast majority of usage is not 
worth optimizing for this long tail.

All tests done 18GB Macbook Air.

# Basic Load Test with Naive File Loader 

This is load test with a "naive loader" which reads the file into the heap and splits on "\n".

30 lines 
Took 0.20 millis to scroll viewport with 30 lines. That's 5000.000298023242 FPS.
Took 1.90 millis to insert with 30 lines. That's 526.315796078077 FPS.
Took 1.60 millis to insert new line with 30 lines. That's 624.9999906867744 FPS.
Took 1.50 millis to delete line with 29 lines. That's 666.6666666666666 FPS.
Took 1.40 millis to delete character with 30 lines. That's 714.2857264499277 FPS.

500k lines, jump to viewport location 250000 x 20 
Took 0.30 millis to scroll viewport with 500001 lines. That's 3333.3332008785724 FPS.
Took 1.30 millis to insert with 500001 lines. That's 769.2307621769652 FPS.
Took 2.30 millis to insert new line with 500003 lines. That's 434.78260644216846 FPS.
Took 2.50 millis to delete line with 500002 lines. That's 400 FPS.
Took 1.10 millis to delete character with 500002 lines. That's 909.0908893868947 FPS.

5 million lines (100 megabytes), jump to viewport 2,999,999 x 20
Took 0.70 millis to scroll viewport with 5000001 lines. That's 1428.5714528998553 FPS.
Took 1.30 millis to insert with 5000000 lines. That's 769.2307621769652 FPS.
Took 6.40 millis to insert new line with 5000001 lines. That's 156.2500005820766 FPS.
Took 1.20 millis to delete character with 5000001 lines. That's 833.3333416117563 FPS.
Took 5.60 millis to delete line with 5000000 lines. That's 178.57142781116525 FPS.

10 million lines (280 megabytes), jump to viewport 
Took 0.70 millis to scroll viewport with 10000001 lines. That's 1428.5713312577295 FPS.
Took 1.30 millis to insert with 10000001 lines. That's 769.2307974459867 FPS.
Took 28.40 millis to insert new line with 10000002 lines. That's 35.211267635193735 FPS.
Took 1.30 millis to delete character with 10000001 lines. That's 769.2307974459867 FPS.
Took 4.60 millis to delete line with 10000001 lines. That's 217.3913060379389 FPS.

It took ~1 second to load the 100mb 10 million line file with the naive loader. Same as with VSCode.

We stop here for the naive loader because its limit is somewhere between the 10 million and 20 million line files. This is likely due to the string length and/or
the ability split on "\n" for such a large string. 

## File 

To avoid Git hosting excessive large files, resouces directory only contain up 200k file. The files were generated as follows:

```bash
seq 1 5000000 | awk '{print "This is line number " $1}' > 5_million_lines.txt
```

This is not representative of real files because there is alot of regularity.
However, it makes it convenient to do apples to apples comparison. 
I also don't trust that the data isn't corrupted or corrupting the app otherwise
where wrong line numbers are attributed. 

## Chunked File Loading 

### No improvement: Sequentially adding lines 

We add an `#appendLine` method to model and send in 100k lines at a time. 

```
const fileLines = fileSourceTextString.split('\n');
primary.Model.lines = []; // Reset the model to start fresh
const BATCH_SIZE = 100_000;
for (let i = 0; i < fileLines.length; i += BATCH_SIZE) {
  const batch = fileLines.slice(i, i + BATCH_SIZE);
  editor.Model.appendLines(batch);
}
```

This doesn't work and still fails on 20 million line files. The bottleneck seems to be on the source file 
being in memory. 

Suspecting `fileSourceTextString.split('\n')` is the issue, the next attempt involved scanning through
fileSourceTextString manually, splitting the string in half (half being the unprocessed string right of new line break) as we grab a chunk and append it. This stil doesn't work. 

### ~70million : File.slice to read byte chunks 

We avoid converting the file to String right away. 
The unit of iteration however are in terms of bytes, i.e. 1mb at a time, rather than lines and strings and delimiters. 

It works!

- [Chunked] Loaded 20,000,000 lines in 1348.00ms // 542.535 MiB (568888897 bytes)
- [Chunked] Loaded 50,000,001 lines in 5351.40ms // 1515.812 MiB (1589444040 bytes)
- [Chunked] Loaded 70,000,001 lines in 10449.20ms // 1925.363 MiB (2018888931 bytes)

The browser tab crashes out at 72 million on a 100 million line file. 

Naive is a little faster between 25-k5 million where performance starts bottoming out. 

- [Naive] Loaded 774 lines in 11.00ms // 0.028 MiB (29585 bytes)
- [Naive] Loaded 25,001 lines in 8.40ms // 0.895 MiB (938894 bytes)
- [Naive] Loaded 200,000 lines in 29.30ms // 5.044 MiB (5288894 bytes)
- [Naive] Loaded 500,001 lines in 41.60ms // 9.431 MiB (9888895 bytes)
- [Naive] Loaded 1,000,001 lines in 68.20ms // 18.968 MiB (19888896 bytes)
- [Naive] Loaded 5,000,001 lines in 295.60ms // 99.076 MiB (103888896 bytes)
- [Naive] Loaded 10,000,001 lines in 821.70ms // 265.969 MiB (278888897 bytes)

- [Chunked] Loaded 773 lines in 2.10ms // 0.028 MiB (29585 bytes)
- [Chunked] Loaded 25,000 lines in 11.80ms // 0.895 MiB (938894 bytes)
- [Chunked] Loaded 200,000 lines in 30.30ms // 5.044 MiB (5288894 bytes)
- [Chunked] Loaded 500,000 lines in 44.80ms // 9.431 MiB (9888895 bytes)
- [Chunked] Loaded 1,000,000 lines in 84.10ms // 18.968 MiB (19888896 bytes)
- [Chunked] Loaded 5,000,000 lines in 293.30ms // 99.076 MiB (103888896 bytes)
- [Chunked] Loaded 10,000,000 lines in 678.70ms // 265.969 MiB (278888897 bytes)

The chunked file byte reader implementation isn't too complex so it should be preferred for the robustness.  

Note: there is a slight off by 1 bug with the chunk-loader adding an implied new line at the end, but that's okay for now. 

#### Memory Usage 

- [Chunked] Loaded 70,000,001 lines in 10449.20ms // 1925.363 MiB (2018888931 bytes)

Consumed 3660MB of heap space, near the 4GB limit of Chrome's browser tab limit. 
Running Chrome from the command line you can specify the flag "--js-flags="--max-old-space-size=8192" but this does not seem to increase the tab limit or heap size, otherwise we might have reached 140 million LOC with this approach alone.

#### Experimenting with other chunk sizes

256kb 
- [Chunked] Loaded 200,000 lines in 44.80ms // 5.044 MiB (5288894 bytes)
- [Chunked] Loaded 500,000 lines in 50.40ms // 9.431 MiB (9888895 bytes)
- [Chunked] Loaded 1,000,000 lines in 97.20ms // 18.968 MiB (19888896 bytes)
- [Chunked] Loaded 5,000,000 lines in 365.80ms // 99.076 MiB (103888896 bytes)
- [Chunked] Loaded 10,000,000 lines in 872.80ms // 265.969 MiB (278888897 bytes)
- [Chunked] Loaded 20,000,000 lines in 1768.60ms // 542.535 MiB (568888897 bytes)
- [Chunked] Loaded 50,000,001 lines in 6921.20ms // 1515.812 MiB (1589444040 bytes)

512KB 
- [Chunked] Loaded 200,000 lines in 35.60ms // 5.044 MiB (5288894 bytes)
- [Chunked] Loaded 500,000 lines in 47.20ms // 9.431 MiB (9888895 bytes)
- [Chunked] Loaded 1,000,000 lines in 95.90ms // 18.968 MiB (19888896 bytes)
- [Chunked] Loaded 5,000,000 lines in 318.90ms // 99.076 MiB (103888896 bytes)
- [Chunked] Loaded 10,000,000 lines in 685.40ms // 265.969 MiB (278888897 bytes)
- [Chunked] Loaded 20,000,000 lines in 1394.80ms // 542.535 MiB (568888897 bytes)
- [Chunked] Loaded 50,000,001 lines in 4838.50ms // 1515.812 MiB (1589444040 bytes)
Crashed on 70,00,000 million @ 65,000,000

1MB
- [Chunked] Loaded 200,000 lines in 30.30ms // 5.044 MiB (5288894 bytes)
- [Chunked] Loaded 500,000 lines in 44.80ms // 9.431 MiB (9888895 bytes)
- [Chunked] Loaded 1,000,000 lines in 84.10ms // 18.968 MiB (19888896 bytes)
- [Chunked] Loaded 5,000,000 lines in 293.30ms // 99.076 MiB (103888896 bytes)
- [Chunked] Loaded 10,000,000 lines in 678.70ms // 265.969 MiB (278888897 bytes)
- [Chunked] Loaded 20,000,000 lines in 1348.00ms // 542.535 MiB (568888897 bytes)
- [Chunked] Loaded 50,000,001 lines in 5351.40ms // 1515.812 MiB (1589444040 bytes)
- [Chunked] Loaded 70,000,001 lines in 10449.20ms // 1925.363 MiB (2018888931 bytes)

2MB

- [Chunked] Loaded 500,000 lines in 41.30ms // 9.431 MiB (9888895 bytes)
- [Chunked] Loaded 1,000,000 lines in 75.10ms // 18.968 MiB (19888896 bytes)
- [Chunked] Loaded 5,000,000 lines in 294.70ms // 99.076 MiB (103888896 bytes)
- [Chunked] Loaded 10,000,000 lines in 640.30ms // 265.969 MiB (278888897 bytes)
- [Chunked] Loaded 20,000,000 lines in 1316.30ms // 542.535 MiB (568888897 bytes)
- [Chunked] Loaded 50,000,001 lines in 5461.80ms // 1515.812 MiB (1589444040 bytes)

3MB sometimes works 

1,000,000 LOC:
warrenbuf.js:441 Uncaught (in promise) RangeError: Maximum call stack size exceeded
    at Object.appendLines (warrenbuf.js:441:18)
    at HTMLButtonElement.<anonymous> (warrenbuf/:522:25)
- [Chunked] Loaded 10,000,000 lines in 663.20ms // 265.969 MiB (278888897 bytes)
- [Chunked] Loaded 50,000,001 lines in 5362.00ms // 1515.812 MiB (1589444040 bytes)

4MB
Maximum call stack exceeded when calling appendLine. 

Takeaway is that we don't want our chunksize to be too large as to risk large number
of lines in that chunk that would call appendLines to fail. At the same time, 
larger chunk sizes are more performant. 

#### Chunked FileReader 

There's a slight variation to this approach. Instead of blob.text(), we get a FileReader on the blob. It's maybe a few percentages faster but more complex dealing with async code.  

- [FileReader] Loaded 200,000 lines in 26.10ms // 5.044 MiB (5288894 bytes)
- [FileReader] Loaded 500,000 lines in 50.60ms // 9.431 MiB (9888895 bytes)
- [FileReader] Loaded 1,000,000 lines in 79.20ms // 18.968 MiB (19888896 bytes)
- [FileReader] Loaded 5,000,000 lines in 295.60ms // 99.076 MiB (103888896 bytes)
- [FileReader] Loaded 10,000,000 lines in 631.10ms // 265.969 MiB (278888897 bytes)
- [FileReader] Loaded 20,000,000 lines in 1388.80ms // 542.535 MiB (568888897 bytes)
- [FileReader] Loaded 50,000,001 lines in 5302.70ms // 1515.812 MiB (1589444040 bytes)
- [FileReader] Loaded 70,000,001 lines in 9702.10ms // 1925.363 MiB (2018888931 bytes)

### Stream Loader 

Stream API is the most modern. It is faster after 1 million then slows down after that.

- [Stream] Loaded 200,000 lines in 16.40ms // 5.044 MiB (5288894 bytes)
- [Stream] Loaded 500,000 lines in 50.40ms // 9.431 MiB (9888895 bytes)
- [Stream] Loaded 1,000,000 lines in 82.60ms // 18.968 MiB (19888896 bytes)
- [Stream] Loaded 5,000,000 lines in 249.60ms // 99.076 MiB (103888896 bytes)
- [Stream] Loaded 10,000,000 lines in 494.00ms // 265.969 MiB (278888897 bytes)
- [Stream] Loaded 20,000,000 lines in 1016.80ms // 542.535 MiB (568888897 bytes)
- [Stream] Loaded 50,000,001 lines in 4380.10ms // 1515.812 MiB (1589444040 bytes)
- [Stream] Loaded 70,000,001 lines in 12008.30ms // 1925.363 MiB (2018888931 bytes)

It crashed on 100m file. However, we don't have visibility where it failed between 
70m and 100m. The implementation of Stream API loader blocks rendering until the entire file is loaded.

#### Yield to the UI rendering 

After adding this logic, we know Stream API crashes at around 75 million. That's an improvement.

### Materializing sliced lines 

After inspecting the heap, I saw there were many [sliced strings] in the heap. It seemed
peculiar that the [sliced strings] accounted for ~100mb of heap and regular strings another ~108mb of heap, and considering the file was ~100mb, it seemed like there was some redundancy and not GC'ed string.

The following was able to squeeze another 5-10% capacity out of the stream loader. In other words, peak heap usage with materialized string is 10% more efficient, albeit it is more computationally expensive.

Before:

```javascript
primary.Model.appendLines(slicedLines, true);
```
Heap usage: 3650GB

After:

```javascript
// Force materialization using Array.from to break sliced string references
const materializedLines = slicedLines.map(line => Array.from(line).join(''));
primary.Model.appendLines(materializedLines, true);
```

Heap peak usage: 3300GB
Heap usage after: 3150GB

Note this is not deterministic. At other times we peak at 3450GB then hang out at 3300GB. This is still a 5-10% improvement.

### Force GC

The heap usage being lower than peak usgae in the materialized line approach shows us we can defer getting to peak usage earlier.

The following hack gets the GC to kick in earlier. 

```javascript
const _ = new Array(100000);
```

Ofcourse non of this is deterministic. It depends on the GC.
It merely has a non-zero chance of reaching meeting max capacity. 

This solution was unstable after 70 million LOC, however it would hit 88 million LOC often.

### Ultra-High-capacity mode 

This mode uses compression techniques. There's a secondary benefit that the compressed data lives in native C++ memory rather than the heap.

Consequently, the editor breezed past the previous 88 million cap and 
reached 1+ billion while consuming ~2.5GB of ram. This is contingent on the 
specific file and its compression profile.

### Ideas

Index DB 
