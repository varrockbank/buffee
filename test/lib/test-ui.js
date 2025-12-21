        // DSL Syntax Highlighter
        function highlightDSL(code) {
            const lines = code.split('\n');
            const highlightedLines = lines.map((line, index) => {
                // Empty lines - just return empty string, browser will handle line breaks
                if (line.trim() === '') {
                    return '';
                }

                // Comment lines starting with #, ##, ###, etc.
                if (line.trim().startsWith('#')) {
                    return `<span class="dsl-comment">${escapeHtml(line)}</span>`;
                }

                // JavaScript pass-through (ends with ; or starts with //)
                if (line.trim().endsWith(';') || line.trim().startsWith('//')) {
                    return `<span class="dsl-javascript">${escapeHtml(line)}</span>`;
                }

                // Use placeholder approach to avoid nested replacements
                let text = escapeHtml(line);
                const strings = [];
                const quantifiers = [];

                // Extract strings and replace with placeholders
                text = text.replace(/"([^"]*)"/g, (match, content) => {
                    const index = strings.length;
                    strings.push(`<span class="dsl-string">"${content}"</span>`);
                    return `__STRING${index}__`;
                });

                // Extract quantifiers and replace with placeholders (before numbers get highlighted)
                text = text.replace(/\b(once)\b/g, (match) => {
                    const index = quantifiers.length;
                    quantifiers.push(`<span class="dsl-quantifier">${match}</span>`);
                    return `__QUANT${index}__`;
                });
                text = text.replace(/\b(\d+\s+times?)\b/g, (match) => {
                    const index = quantifiers.length;
                    quantifiers.push(`<span class="dsl-quantifier">${match}</span>`);
                    return `__QUANT${index}__`;
                });

                // Now do all other replacements on text without strings or quantifiers
                // Keywords: TYPE, PRESS, EXPECT, at, with
                text = text.replace(/\b(TYPE|PRESS|EXPECT|at|with)\b/g, '<span class="dsl-keyword">$1</span>');

                // Special keys (movement keys)
                text = text.replace(/\b(backspace|enter|left|right|up|down)\b/g, '<span class="dsl-special-key">$1</span>');

                // Single character literals (like "a" in "PRESS a")
                text = text.replace(/\b([a-zA-Z])\b/g, '<span class="dsl-special-key">$1</span>');

                // Modifiers: shift, meta (blue like special keys)
                text = text.replace(/\b(shift|meta)\b/g, '<span class="dsl-special-key">$1</span>');

                // EXPECT targets: cursor, selection (purple like quantifiers)
                text = text.replace(/\b(cursor|selection)\b/g, '<span class="dsl-quantifier">$1</span>');

                // Numbers (standalone, not part of quantifiers) - also purple for coordinates
                text = text.replace(/\b(\d+)\b/g, '<span class="dsl-quantifier">$1</span>');

                // Restore quantifiers from placeholders
                text = text.replace(/__QUANT(\d+)__/g, (match, index) => {
                    return quantifiers[parseInt(index)];
                });

                // Restore strings from placeholders
                text = text.replace(/__STRING(\d+)__/g, (match, index) => {
                    return strings[parseInt(index)];
                });

                return text;
            });

            return highlightedLines.join('\n');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Declare variables before they're used in functions
        let testsCompiledSinceLastView = false;
        let lastCompileHadErrors = false;
        let lastCompileErrors = [];
        let lastDuplicates = [];

        // Tab switching with deeplink support
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        function switchToTab(tabName) {
            // Remove active class from all tabs and content
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to specified tab and corresponding content
            const targetTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
            const targetContent = document.getElementById(`tab-${tabName}`);

            if (targetTab && targetContent) {
                targetTab.classList.add('active');
                targetContent.classList.add('active');

                // Shake timer if switching to tests tab and tests were compiled since last view
                if (tabName === 'tests') {
                    const timingDiv = document.getElementById('test-timing');
                    if (testsCompiledSinceLastView) {
                        timingDiv.classList.remove('shake');
                        void timingDiv.offsetWidth; // Force reflow
                        timingDiv.classList.add('shake');
                        testsCompiledSinceLastView = false;
                    } else {
                        // Ensure shake class is removed if we're not shaking
                        timingDiv.classList.remove('shake');
                    }
                }
            }
        }

        // Handle tab clicks
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                // Update URL hash without triggering scroll
                history.replaceState(null, null, `#${tabName}`);
                switchToTab(tabName);
            });
        });

        // Handle browser navigation (back/forward)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash;

            // Check if it's a walkthrough deeplink
            if (hash.startsWith('#walkthrough/')) {
                // Switch to tests tab first
                switchToTab('tests');
                // Open walkthrough from hash
                setTimeout(() => walkthrough.openFromHash(hash), 100);
            } else if (hash) {
                // Regular tab deeplink
                const tabName = hash.slice(1); // Remove the '#'
                switchToTab(tabName);
            }
        });

        // Initialize tab or walkthrough based on URL hash on page load
        function initializeFromHash() {
            const hash = window.location.hash;

            if (hash.startsWith('#walkthrough/')) {
                // Switch to tests tab first
                switchToTab('tests');
                // Defer walkthrough opening until tests are loaded
                // This will be called after runAllTests() completes
                window.deferredWalkthroughHash = hash;
            } else if (hash) {
                // Regular tab deeplink
                const tabName = hash.slice(1);
                switchToTab(tabName);
            }
        }

        // Call after DOM is ready
        initializeFromHash();

        // Source tab logic
        const transpiler = new DSLTranspiler();
        const generator = new SpecGenerator(transpiler);
        const outputEl = document.getElementById('js-output');
        const generateBtn = document.getElementById('generate-btn');
        const statusUpToDate = document.getElementById('status-uptodate');

        let dslEditor = null;
        let lastGeneratedSource = '';

        // Helper functions for Buffee editor
        function getEditorContent() {
            return dslEditor ? dslEditor.Model.lines.join('\n') : '';
        }

        function setEditorContent(text) {
            if (dslEditor) dslEditor.Model.text = text;
        }

        let jsOutputEditor = null;

        // Initialize DSL editor after DOM is ready
        function initDSLEditor() {
            const dslEditorEl = document.getElementById('dsl-editor');
            dslEditor = new Buffee(dslEditorEl, {
                showGutter: true,
                viewportRows: 20
            });

            // Initialize JS output editor (read-only, different dimensions)
            const jsOutputEl = document.getElementById('js-output');
            jsOutputEditor = new Buffee(jsOutputEl, {
                showGutter: true,
                viewportRows: 20
            });
            jsOutputEditor.editMode = 'navigate';

            // Enable syntax highlighting for JavaScript
            BuffeeSyntax(jsOutputEditor);
            jsOutputEditor.Syntax.setLanguage('javascript');
            jsOutputEditor.Syntax.setColors({
                keyword: '#0e639c',
                string: '#a31515',
                comment: '#008000',
                number: '#098658',
                function: '#795e26',
                type: '#267f99',
                variable: '#001080',
                constant: '#0e639c',
                operator: '#333',
                punctuation: '#333',
                default: '#333'
            });
            jsOutputEditor.Syntax.enabled = true;
        }

        function updateUIState() {
            const currentSource = getEditorContent();
            const isUpToDate = currentSource === lastGeneratedSource;

            generateBtn.disabled = isUpToDate;

            const testStaleWarning = document.getElementById('test-stale-warning');
            const outputEl = document.getElementById('js-output');

            if (isUpToDate) {
                outputEl.classList.remove('stale');
                statusUpToDate.classList.add('visible');
                if (testStaleWarning) testStaleWarning.style.display = 'none';
            } else {
                outputEl.classList.add('stale');
                statusUpToDate.classList.remove('visible');
                if (testStaleWarning) testStaleWarning.style.display = 'inline';
            }
        }

        function transpileDSL() {
            const dslSource = getEditorContent();
            const errorWarning = document.getElementById('error-warning');
            const errorWarningText = document.querySelector('.error-warning-text');
            const errorsModalContent = document.getElementById('compile-errors-content');

            try {
                const result = generator.generate(dslSource);
                const jsOutput = result.code;
                const errors = result.errors;
                const duplicates = result.duplicates || [];

                // Display generated JavaScript
                if (jsOutputEditor) {
                    jsOutputEditor.Model.text = jsOutput;
                }
                const outputEl = document.getElementById('js-output');
                outputEl.dataset.plainJs = jsOutput; // Store plain JavaScript for eval
                outputEl.dataset.hasDuplicates = duplicates.length > 0 ? 'true' : 'false';

                // Handle duplicate test names (fatal error)
                if (duplicates.length > 0) {
                    lastCompileHadErrors = true;
                    lastCompileErrors = [];
                    lastDuplicates = duplicates;

                    // Add red border to JS output for duplicates
                    outputEl.classList.add('has-errors');
                    outputEl.style.borderColor = '#f44336';

                    // Show fatal error warning in header
                    const dupCount = duplicates.length;
                    const dupText = dupCount === 1 ? '1 duplicate test name' : `${dupCount} duplicate test names`;
                    errorWarningText.textContent = `⚠ FATAL: ${dupText} detected`;
                    errorWarning.style.display = 'flex';

                    // Populate modal with duplicate details
                    let errorHtml = '<div style="padding: 1rem; background: #3a1e1e; border-left: 4px solid #f44336; margin-bottom: 1rem;">';
                    errorHtml += '<div style="font-size: 1.1rem; font-weight: bold; color: #f44336; margin-bottom: 0.5rem;">FATAL ERROR: Duplicate Test Names</div>';
                    errorHtml += '<div style="margin-bottom: 0.5rem;">Tests cannot run when multiple tests have the same name within a suite.</div>';
                    errorHtml += '</div>';

                    duplicates.forEach(dup => {
                        errorHtml += `
                            <div class="error-item" style="border-left-color: #f44336;">
                                <div class="error-location">Duplicate: "${dup.suite}" > "${dup.test}"</div>
                                <div class="error-message">First defined on line ${dup.firstLine}</div>
                                <div class="error-message">Duplicate found on line ${dup.secondLine}</div>
                            </div>
                        `;
                    });
                    errorsModalContent.innerHTML = errorHtml;
                }
                // Handle compile errors
                else if (errors && errors.length > 0) {
                    lastCompileHadErrors = true;
                    lastCompileErrors = errors;

                    // Add yellow border to JS output
                    outputEl.classList.add('has-errors');

                    // Show warning in header
                    const errorCount = errors.length;
                    const errorText = errorCount === 1 ? '1 error' : `${errorCount} errors`;
                    errorWarningText.textContent = `⚠ Compiled with ${errorText}`;
                    errorWarning.style.display = 'flex';

                    // Populate modal content
                    let errorHtml = '';
                    errors.forEach(err => {
                        const locationInfo = err.suite
                            ? `Line ${err.line} @ Suite: "${err.suite}"${err.test ? ' → Test: "' + err.test + '"' : ''}`
                            : 'Line ' + err.line;
                        errorHtml += `
                            <div class="error-item">
                                <div class="error-location">${locationInfo}</div>
                                <div class="error-code">${err.code}</div>
                                <div class="error-message">Omitted because it caused error:</div>
                                <div class="error-code">${err.message}</div>
                            </div>
                        `;
                    });
                    errorsModalContent.innerHTML = errorHtml;
                } else {
                    // No errors - clear styling
                    lastCompileHadErrors = false;
                    lastCompileErrors = [];
                    lastDuplicates = [];
                    outputEl.classList.remove('has-errors');
                    outputEl.style.borderColor = '';
                    errorWarning.style.display = 'none';
                    errorsModalContent.innerHTML = '';
                }

                lastGeneratedSource = dslSource;
                updateUIState();
            } catch (error) {
                lastCompileHadErrors = false;
                lastCompileErrors = [];
                if (jsOutputEditor) {
                    jsOutputEditor.Model.text = `Error: ${error.message}`;
                }
                delete outputEl.dataset.plainJs;
                outputEl.classList.remove('has-errors');
                errorWarning.style.display = 'none';
                lastGeneratedSource = dslSource;
                updateUIState();
            }
        }

        function openCompileErrorsModal() {
            document.getElementById('compile-errors-backdrop').classList.add('active');
            document.getElementById('compile-errors-modal').classList.add('active');
        }

        function closeCompileErrorsModal() {
            document.getElementById('compile-errors-backdrop').classList.remove('active');
            document.getElementById('compile-errors-modal').classList.remove('active');
        }

        // Event listeners
        document.getElementById('error-details-btn').addEventListener('click', openCompileErrorsModal);
        document.getElementById('test-error-details-btn').addEventListener('click', openCompileErrorsModal);
        document.getElementById('compile-errors-backdrop').addEventListener('click', closeCompileErrorsModal);

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('compile-errors-modal');
                if (modal.classList.contains('active')) {
                    closeCompileErrorsModal();
                }
            }
        });

        // Spec files to load (in order)
        const SPEC_FILES = [
            './specs/spec-core.dsl',
            './specs/spec-navigation.dsl',
            './specs/spec-selection.dsl',
            './specs/spec-features.dsl',
            './specs/spec-regression.dsl'
        ];

        async function loadDSL() {
            try {
                const contents = await Promise.all(
                    SPEC_FILES.map(async (file) => {
                        const response = await fetch(file);
                        if (!response.ok) {
                            throw new Error(`Failed to load ${file}: ${response.status} ${response.statusText}`);
                        }
                        return { file, content: await response.text() };
                    })
                );

                // Build file/line map for diagnostics
                window.dslFileMap = [];
                let globalLine = 1;
                contents.forEach(({ file, content }) => {
                    const lineCount = content.split('\n').length;
                    window.dslFileMap.push({ file: file.replace('./specs/', ''), start: globalLine, end: globalLine + lineCount - 1 });
                    globalLine += lineCount + 2; // +2 for the \n\n between files
                });

                const content = contents.map(c => c.content).join('\n\n');
                setEditorContent(content);
                transpileDSL();

                // Run tests after loading and transpiling
                await runAllTests();

                // Open deferred walkthrough if URL had a walkthrough hash
                if (window.deferredWalkthroughHash) {
                    setTimeout(() => {
                        walkthrough.openFromHash(window.deferredWalkthroughHash);
                        window.deferredWalkthroughHash = null;
                    }, 100);
                }
            } catch (error) {
                setEditorContent(`Error loading DSL file: ${error.message}`);
                console.error('Error loading DSL:', error);
            }
        }

        // Generate button
        generateBtn.addEventListener('click', async () => {
            transpileDSL();
            await runAllTests();
            testsCompiledSinceLastView = true;
        });

        // Load DSL when page loads
        window.addEventListener('DOMContentLoaded', () => {
            initDSLEditor();

            // Poll for content changes since Buffee doesn't have change events
            let lastContent = '';
            setInterval(() => {
                const currentContent = getEditorContent();
                if (currentContent !== lastContent) {
                    lastContent = currentContent;
                    updateUIState();
                }
            }, 500);

            loadDSL();
        });

        // Test runner logic - must be global for eval'd code
        window.runner = new TestRunner();
        const runner = window.runner;

        function renderResults(results) {
            const resultsContainer = document.getElementById('test-results');
            resultsContainer.innerHTML = '';

            // Build set of tests with compilation errors
            const testsWithCompileErrors = new Set();
            if (lastCompileErrors && lastCompileErrors.length > 0) {
                lastCompileErrors.forEach(err => {
                    if (err.suite && err.test) {
                        testsWithCompileErrors.add(`${err.suite}:${err.test}`);
                    }
                });
            }

            runner.suites.forEach(suite => {
                const suiteDiv = document.createElement('div');
                suiteDiv.className = 'test-suite';

                const suiteHeader = document.createElement('div');
                suiteHeader.className = 'test-suite-header';
                const passedInSuite = suite.results.filter(t => t.status === 'pass').length;
                const failedInSuite = suite.results.filter(t => t.status === 'fail').length;
                suiteHeader.innerHTML = `
                    <div>
                        <span>${suite.name}</span>
                        <span style="margin-left: 12px; opacity: 0.7; font-size: 12px;">
                            ${passedInSuite} passed, ${failedInSuite} failed
                        </span>
                    </div>
                    <span class="toggle-icon">▼</span>
                `;
                suiteHeader.onclick = () => suiteDiv.classList.toggle('collapsed');

                const suiteBody = document.createElement('div');
                suiteBody.className = 'test-suite-body';

                suite.results.forEach((test, testIndex) => {
                    const testDiv = document.createElement('div');
                    const hasCompileError = testsWithCompileErrors.has(`${suite.name}:${test.name}`);
                    const compileErrorClass = hasCompileError ? ' has-compile-error' : '';
                    testDiv.className = `test-case ${test.status}${compileErrorClass}`;

                    const icon = test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '○';
                    const compileErrorIcon = hasCompileError ? '<span class="compile-error-icon">⚠</span>' : '';
                    const hasWalkthroughSteps = test.fixture?.walkthrough?.steps?.length > 0;
                    const walkthroughBtn = hasWalkthroughSteps
                        ? `<button class="walkthrough-btn" onclick="walkthrough.open('${suite.name}', ${testIndex})">Walkthrough</button>`
                        : `<span class="walkthrough-na">Walkthrough N/A</span>`;

                    testDiv.innerHTML = `
                        <span class="test-icon ${test.status}">${icon}${compileErrorIcon}</span>
                        <div class="test-message">
                            ${test.name}
                            ${test.description ? `<div class="test-description">${test.description}</div>` : ''}
                            ${test.error ? `<div class="test-error">${test.error.message}</div>` : ''}
                        </div>
                        ${walkthroughBtn}
                    `;

                    suiteBody.appendChild(testDiv);
                });

                suiteDiv.appendChild(suiteHeader);
                suiteDiv.appendChild(suiteBody);
                resultsContainer.appendChild(suiteDiv);
            });

            document.getElementById('total-tests').textContent = results.total;
            document.getElementById('passed-tests').textContent = results.passed;
            document.getElementById('failed-tests').textContent = results.failed;
            document.getElementById('skipped-tests').textContent = results.skipped;
        }

        async function runAllTests() {
            // Load tests from generated JavaScript
            const outputEl = document.getElementById('js-output');
            let generatedJS = outputEl.dataset.plainJs || (jsOutputEditor ? jsOutputEditor.Model.lines.join('\n') : '');

            if (!generatedJS || generatedJS.startsWith('Error:')) {
                const resultsContainer = document.getElementById('test-results');
                resultsContainer.innerHTML = '<div style="padding: 20px; color: #f48771;">No valid test specification available. Generate JavaScript from the Source tab first.</div>';
                return;
            }

            try {
                // Clear previous test definitions
                runner.suites = [];

                // Remove the runner declaration from generated code since we have a global runner
                generatedJS = generatedJS.replace(/const runner = new TestRunner\(\);?\n?/, '');

                // Execute generated JavaScript to define tests
                eval(generatedJS);

                const startTime = new Date();
                const results = await runner.run();
                const endTime = new Date();
                const duration = endTime - startTime;

                const timingDiv = document.getElementById('test-timing');
                timingDiv.innerHTML = `
                    <span class="icon">⏱️</span>
                    <span class="duration">Runtime: ${duration} ms</span>
                    <span class="details">(Started: ${startTime.toLocaleTimeString()} • Ended: ${endTime.toLocaleTimeString()})</span>
                `;

                renderResults(results);

                // Show/hide test error warning based on compile status
                const testErrorWarning = document.getElementById('test-error-warning');
                const compileErrorsSummary = document.getElementById('compile-errors-summary');
                const compileErrorTestsCount = document.getElementById('compile-error-tests');

                if (lastCompileHadErrors && lastCompileErrors.length > 0) {
                    // Count unique tests with errors (not total error count)
                    const testsWithErrors = new Set();
                    lastCompileErrors.forEach(err => {
                        if (err.suite && err.test) {
                            testsWithErrors.add(`${err.suite}:${err.test}`);
                        }
                    });

                    const uniqueTestCount = testsWithErrors.size;
                    compileErrorTestsCount.textContent = uniqueTestCount;
                    testErrorWarning.style.display = 'flex';
                } else {
                    compileErrorTestsCount.textContent = '0';
                    testErrorWarning.style.display = 'none';
                }
            } catch (error) {
                const resultsContainer = document.getElementById('test-results');

                // Check if this is a duplicate test names error
                if (error.message.includes('Duplicate test names detected')) {
                    // Use stored duplicates information for detailed display
                    let duplicatesHtml = '';

                    if (lastDuplicates.length > 0) {
                        lastDuplicates.forEach(dup => {
                            duplicatesHtml += `
                                <div style="background: #2d2d30; padding: 1rem; margin: 0.75rem 0; border-left: 3px solid #f44336; border-radius: 3px;">
                                    <div style="font-size: 1rem; color: #4EC9B0; font-weight: 600; margin-bottom: 0.5rem;">
                                        "${dup.suite}" > "${dup.test}"
                                    </div>
                                    <div style="font-size: 0.9rem; color: #d4d4d4;">
                                        First defined on <strong style="color: #f48771;">line ${dup.firstLine}</strong>
                                    </div>
                                    <div style="font-size: 0.9rem; color: #d4d4d4;">
                                        Duplicate found on <strong style="color: #f48771;">line ${dup.secondLine}</strong>
                                    </div>
                                </div>
                            `;
                        });
                    }

                    resultsContainer.innerHTML = `
                        <div style="padding: 20px; background: #3a1e1e; border: 2px solid #f44336; border-radius: 6px; margin-top: 20px;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #f44336; margin-bottom: 1rem;">
                                ⚠ No Tests Ran: Duplicate Test Names Detected
                            </div>
                            <div style="font-size: 1rem; color: #d4d4d4; margin-bottom: 1rem;">
                                Tests cannot run when multiple tests have the same name within a suite.
                            </div>
                            ${duplicatesHtml}
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #555;">
                                <strong>To fix:</strong> Rename one of the duplicate tests to make them unique within the suite.
                            </div>
                        </div>
                    `;

                    // Update summary to show no tests ran
                    document.getElementById('total-tests').textContent = '0';
                    document.getElementById('passed-tests').textContent = '0';
                    document.getElementById('failed-tests').textContent = '0';
                    document.getElementById('skipped-tests').textContent = '0';
                    document.getElementById('test-timing').innerHTML = '';

                    // Hide the test error banner (details are shown in main results area)
                    const testErrorWarning = document.getElementById('test-error-warning');
                    testErrorWarning.style.display = 'none';
                } else {
                    resultsContainer.innerHTML = `<div style="padding: 20px; color: #f48771;">Error loading tests: ${error.message}</div>`;
                }

                console.error('Error executing generated tests:', error);
            }
        }


        // Global walkthrough instance
        const walkthrough = new Walkthrough();

        // Close walkthrough when clicking backdrop
        document.getElementById('walkthrough-backdrop').addEventListener('click', () => {
            walkthrough.close();
        });

        // Walkthrough keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const walkthroughPanel = document.getElementById('walkthrough-panel');
            if (walkthroughPanel && walkthroughPanel.classList.contains('active')) {
                if (e.key === 'Escape') {
                    walkthrough.close();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    walkthrough.stepPrev();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    walkthrough.stepNext();
                }
            }
        });

        // Walkthrough code tab switching
        const walkthroughCodeTabs = document.querySelectorAll('.walkthrough-code-tab');
        const walkthroughCodeJsView = document.getElementById('walkthrough-code-js');
        const walkthroughCodeDslView = document.getElementById('walkthrough-code-dsl');
        const copyDslBtn = document.getElementById('copy-dsl-btn');

        walkthroughCodeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-code-tab');

                // Remove active class from all tabs
                walkthroughCodeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show/hide corresponding views
                if (tabName === 'js') {
                    walkthroughCodeJsView.style.display = 'block';
                    walkthroughCodeDslView.style.display = 'none';
                    copyDslBtn.style.display = 'none';
                } else if (tabName === 'dsl') {
                    walkthroughCodeJsView.style.display = 'none';
                    walkthroughCodeDslView.style.display = 'block';
                    copyDslBtn.style.display = 'block';
                }
            });
        });

        // Copy DSL source to clipboard
        function copyDSLSource() {
            const dslView = document.getElementById('walkthrough-code-dsl');
            const codeLines = dslView.querySelectorAll('.code-line');

            // Extract text from each line, removing HTML markers
            const lines = Array.from(codeLines).map(line => {
                // Clone the line to avoid modifying the DOM
                const clone = line.cloneNode(true);
                // Remove marker elements
                const markers = clone.querySelectorAll('.step-marker, .error-marker, .success-marker');
                markers.forEach(marker => marker.remove());
                // Get the text content
                return clone.textContent.trim();
            });

            const dslText = lines.join('\n');

            // Copy to clipboard
            navigator.clipboard.writeText(dslText).then(() => {
                // Visual feedback
                const originalText = copyDslBtn.textContent;
                copyDslBtn.textContent = 'Copied!';
                copyDslBtn.style.backgroundColor = '#4CAF50';
                setTimeout(() => {
                    copyDslBtn.textContent = originalText;
                    copyDslBtn.style.backgroundColor = '';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy to clipboard');
            });
        }

        // ===========================================
        // Extension Tests
        // ===========================================

        class ExtensionTestRunner {
            constructor() {
                this.suites = [];
                this.currentSuite = null;
            }

            describe(name, fn) {
                this.currentSuite = { name, tests: [], results: [] };
                this.suites.push(this.currentSuite);
                fn();
                this.currentSuite = null;
            }

            it(name, fn) {
                if (this.currentSuite) {
                    this.currentSuite.tests.push({ name, fn });
                }
            }

            async run() {
                let passed = 0, failed = 0, total = 0;

                for (const suite of this.suites) {
                    for (const test of suite.tests) {
                        total++;
                        try {
                            await test.fn();
                            suite.results.push({ name: test.name, status: 'pass' });
                            passed++;
                        } catch (error) {
                            suite.results.push({ name: test.name, status: 'fail', error });
                            failed++;
                        }
                    }
                }

                return { total, passed, failed };
            }

            clear() {
                this.suites = [];
            }
        }

        const extRunner = new ExtensionTestRunner();

        // Simple assertion helpers
        function assertEqual(actual, expected, msg = '') {
            if (actual !== expected) {
                throw new Error(`${msg}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        }

        function assertDeepEqual(actual, expected, msg = '') {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`${msg}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        }

        function assertTrue(value, msg = '') {
            if (!value) {
                throw new Error(msg || 'Expected true, got false');
            }
        }

        function assertFalse(value, msg = '') {
            if (value) {
                throw new Error(msg || 'Expected false, got true');
            }
        }

        // Create a test editor instance
        function createTestEditor(opts = {}) {
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; width: 600px; height: 400px; visibility: hidden;';
            container.innerHTML = `
                <div class="wb no-select">
                    <textarea class="wb-clipboard-bridge" aria-hidden="true"></textarea>
                    <div class="no-select wb-elements">
                        <div class="wb-gutter"></div>
                        <div class="wb-lines" tabindex="0"><blockquote class="wb-layer-text"></blockquote><div class="wb-layer-elements"></div><div class="wb-cursor"></div></div>
                    </div>
                    <div class="wb-status" style="display: flex; justify-content: space-between;">
                        <div class="wb-status-left"><span class="wb-linecount"></span></div>
                        <div class="wb-status-right">
                            Ln <span class="wb-head-row"></span>, Col <span class="wb-head-col"></span>|

                            <span class="buffee-spaces"></span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(container);
            const el = container.querySelector('.wb');
            const editor = new Buffee(el, { viewportRows: 10, ...opts });
            return { editor, container, cleanup: () => container.remove() };
        }

        // Define extension tests
        function defineExtensionTests() {
            extRunner.clear();

            // ===== SYNTAX HIGHLIGHTING TESTS =====
            extRunner.describe('Syntax Highlighting', () => {
                extRunner.it('tokenizes JavaScript keywords', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeSyntax(editor);
                        editor.Syntax.setLanguage('javascript');
                        editor.Syntax.enabled = true;
                        editor.Model.text = 'const x = 42;';

                        const { tokens } = editor.Syntax.tokenizeLine('const x = 42;', 0);
                        assertTrue(tokens.length > 0, 'Should have tokens');
                        assertEqual(tokens[0].type, 'keyword', 'First token should be keyword');
                        assertEqual(tokens[0].text, 'const', 'Keyword should be "const"');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('tokenizes JavaScript strings', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeSyntax(editor);
                        editor.Syntax.setLanguage('javascript');
                        const { tokens } = editor.Syntax.tokenizeLine('"hello world"', 0);
                        const stringToken = tokens.find(t => t.type === 'string');
                        assertTrue(!!stringToken, 'Should find string token');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('handles multiline comments', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeSyntax(editor);
                        editor.Syntax.setLanguage('javascript');
                        editor.Model.text = '/* start\nmiddle\nend */';

                        // First line starts comment
                        const result1 = editor.Syntax.tokenizeLine('/* start', 0);
                        assertTrue(result1.endState > 0, 'Should enter multiline state');

                        // Middle line continues comment
                        const result2 = editor.Syntax.tokenizeLine('middle', result1.endState);
                        assertTrue(result2.endState > 0, 'Should stay in multiline state');

                        // Last line ends comment
                        const result3 = editor.Syntax.tokenizeLine('end */', result2.endState);
                        assertEqual(result3.endState, 0, 'Should return to normal state');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('invalidates state cache on edit', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeSyntax(editor);
                        editor.Syntax.setLanguage('javascript');
                        editor.Syntax.enabled = true;
                        editor.Model.text = 'line1\nline2\nline3';

                        // Force state cache population
                        editor.Syntax.ensureStateCache(2);
                        assertTrue(editor.Syntax.stateCache.length >= 3, 'State cache should be populated');

                        // Simulate edit by setting text
                        editor.Model.text = 'changed';
                        assertEqual(editor.Syntax.stateCache.length, 1, 'State cache should be reset');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('supports multiple languages', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeSyntax(editor);

                        // Test JavaScript
                        editor.Syntax.setLanguage('javascript');
                        let { tokens } = editor.Syntax.tokenizeLine('function test() {}', 0);
                        assertTrue(tokens.some(t => t.type === 'keyword'), 'JS should have keyword');

                        // Test Python
                        editor.Syntax.setLanguage('python');
                        ({ tokens } = editor.Syntax.tokenizeLine('def test():', 0));
                        assertTrue(tokens.some(t => t.type === 'keyword'), 'Python should have keyword');

                        // Test CSS
                        editor.Syntax.setLanguage('css');
                        ({ tokens } = editor.Syntax.tokenizeLine('.class { color: red; }', 0));
                        assertTrue(tokens.length > 0, 'CSS should have tokens');
                    } finally {
                        cleanup();
                    }
                });
            });

            // ===== ELEMENTALS TESTS =====
            extRunner.describe('Elementals', () => {
                extRunner.it('adds button elements', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeElementals(editor);
                        editor.Model.text = '\n\n\n';
                        const id = editor.Elementals.addButton({
                            row: 1, col: 5, label: 'Test'
                        });
                        assertTrue(id > 0, 'Should return element ID');
                        assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                        assertEqual(editor.Elementals.elements[0].type, 'button', 'Should be button type');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('adds label elements', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeElementals(editor);
                        editor.Model.text = '\n\n\n';
                        editor.Elementals.addLabel({ row: 1, col: 5, text: 'Label' });
                        assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                        assertEqual(editor.Elementals.elements[0].type, 'label', 'Should be label type');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('adds input elements', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeElementals(editor);
                        editor.Model.text = '\n\n\n';
                        editor.Elementals.addInput({
                            row: 1, col: 5, width: 20, placeholder: 'Type here'
                        });
                        assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                        assertEqual(editor.Elementals.elements[0].type, 'input', 'Should be input type');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('navigates between elements', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeElementals(editor);
                        editor.Model.text = '\n\n\n\n\n';
                        editor.Elementals.addButton({ row: 1, col: 2, label: 'A' });
                        editor.Elementals.addButton({ row: 2, col: 2, label: 'B' });
                        editor.Elementals.addButton({ row: 3, col: 2, label: 'C' });
                        editor.Elementals.enabled = true;

                        const focusable = editor.Elementals.getFocusableElements();
                        assertEqual(focusable.length, 3, 'Should have 3 focusable elements');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('removes elements', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeElementals(editor);
                        editor.Model.text = '\n\n\n';
                        const id = editor.Elementals.addButton({ row: 1, col: 2, label: 'Test' });
                        assertEqual(editor.Elementals.elements.length, 1, 'Should have 1 element');
                        editor.Elementals.removeElement(id);
                        assertEqual(editor.Elementals.elements.length, 0, 'Should have 0 elements after removal');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('clears all elements', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeElementals(editor);
                        editor.Model.text = '\n\n\n';
                        editor.Elementals.addButton({ row: 1, col: 2, label: 'A' });
                        editor.Elementals.addButton({ row: 2, col: 2, label: 'B' });
                        assertEqual(editor.Elementals.elements.length, 2, 'Should have 2 elements');
                        editor.Elementals.clear();
                        assertEqual(editor.Elementals.elements.length, 0, 'Should have 0 elements after clear');
                    } finally {
                        cleanup();
                    }
                });
            });

            // ===== TUI LEGACY TESTS =====
            extRunner.describe('TUI Legacy', () => {
                extRunner.it('initializes TUI extension', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeTUI(editor);
                        assertTrue(!!editor.TUI, 'TUI should be attached to editor');
                        assertFalse(editor.TUI.enabled, 'TUI should be disabled by default');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('adds buttons', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeTUI(editor);
                        editor.Model.text = '\n\n\n';
                        const id = editor.TUI.addButton({
                            row: 1, col: 2, label: ' OK '
                        });
                        assertTrue(id > 0, 'Should return element ID');
                        assertEqual(editor.TUI.elements.length, 1, 'Should have 1 element');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('adds buttons with borders', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeTUI(editor);
                        editor.Model.text = '\n\n\n\n';
                        const id = editor.TUI.addButton({
                            row: 1, col: 2, label: 'OK', border: true
                        });
                        assertTrue(id > 0, 'Should return element ID');
                        // Bordered buttons have 3 content lines (top border, label, bottom border)
                        assertEqual(editor.TUI.elements[0].contents.length, 3, 'Bordered button should have 3 content lines');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('handles navigation', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeTUI(editor);
                        editor.Model.text = '\n\n\n\n';
                        editor.TUI.addButton({ row: 1, col: 2, label: 'A' });
                        editor.TUI.addButton({ row: 2, col: 2, label: 'B' });
                        editor.TUI.enabled = true;

                        // TUI uses elements array directly
                        assertEqual(editor.TUI.elements.length, 2, 'Should have 2 elements');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('clears elements', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeTUI(editor);
                        editor.Model.text = '\n\n\n';
                        editor.TUI.addButton({ row: 1, col: 2, label: 'Test' });
                        editor.TUI.clear();
                        assertEqual(editor.TUI.elements.length, 0, 'Should have 0 elements after clear');
                    } finally {
                        cleanup();
                    }
                });
            });

            // ===== CHUNKLOADER TESTS =====
            extRunner.describe('UltraHighCapacity', () => {
                extRunner.it('initializes UltraHighCapacity extension', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeUltraHighCapacity(editor);
                        assertTrue(!!editor.UltraHighCapacity, 'UltraHighCapacity should be attached to editor');
                        assertFalse(editor.UltraHighCapacity.enabled, 'Should be disabled by default');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('activates chunked mode', () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeUltraHighCapacity(editor);
                        editor.UltraHighCapacity.activate(1000);
                        assertTrue(editor.UltraHighCapacity.enabled, 'Should be enabled after activate');
                        assertEqual(editor.UltraHighCapacity.totalLines, 0, 'Should start with 0 lines');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('tracks total lines after append', async () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeUltraHighCapacity(editor);
                        editor.UltraHighCapacity.activate(1000);

                        // Append some lines
                        await editor.UltraHighCapacity.appendLines(['line1', 'line2', 'line3']);
                        assertEqual(editor.UltraHighCapacity.totalLines, 3, 'Should have 3 total lines');
                    } finally {
                        cleanup();
                    }
                });

                extRunner.it('clears chunk data', async () => {
                    const { editor, cleanup } = createTestEditor();
                    try {
                        BuffeeUltraHighCapacity(editor);
                        editor.UltraHighCapacity.activate(1000);
                        await editor.UltraHighCapacity.appendLines(['line1', 'line2']);
                        assertEqual(editor.UltraHighCapacity.totalLines, 2, 'Should have 2 lines');

                        editor.UltraHighCapacity.clear();
                        assertEqual(editor.UltraHighCapacity.totalLines, 0, 'Should have 0 lines after clear');
                    } finally {
                        cleanup();
                    }
                });
            });
        }

        function renderExtensionResults(results) {
            const resultsContainer = document.getElementById('ext-test-results');
            resultsContainer.innerHTML = '';

            extRunner.suites.forEach(suite => {
                const suiteDiv = document.createElement('div');
                suiteDiv.className = 'test-suite';

                const passedInSuite = suite.results.filter(t => t.status === 'pass').length;
                const failedInSuite = suite.results.filter(t => t.status === 'fail').length;

                const suiteHeader = document.createElement('div');
                suiteHeader.className = 'test-suite-header';
                suiteHeader.innerHTML = `
                    <div>
                        <span>${suite.name}</span>
                        <span style="margin-left: 12px; opacity: 0.7; font-size: 12px;">
                            ${passedInSuite} passed, ${failedInSuite} failed
                        </span>
                    </div>
                    <span class="toggle-icon">▼</span>
                `;
                suiteHeader.onclick = () => suiteDiv.classList.toggle('collapsed');

                const suiteBody = document.createElement('div');
                suiteBody.className = 'test-suite-body';

                suite.results.forEach(test => {
                    const testDiv = document.createElement('div');
                    testDiv.className = `test-case ${test.status}`;
                    const icon = test.status === 'pass' ? '✓' : '✗';

                    testDiv.innerHTML = `
                        <span class="test-icon ${test.status}">${icon}</span>
                        <div class="test-message">
                            ${test.name}
                            ${test.error ? `<div class="test-error">${test.error.message}</div>` : ''}
                        </div>
                    `;

                    suiteBody.appendChild(testDiv);
                });

                suiteDiv.appendChild(suiteHeader);
                suiteDiv.appendChild(suiteBody);
                resultsContainer.appendChild(suiteDiv);
            });

            document.getElementById('ext-total-tests').textContent = results.total;
            document.getElementById('ext-passed-tests').textContent = results.passed;
            document.getElementById('ext-failed-tests').textContent = results.failed;
        }

        async function runExtensionTests() {
            const startTime = new Date();

            defineExtensionTests();
            const results = await extRunner.run();

            const endTime = new Date();
            const duration = endTime - startTime;

            const timingDiv = document.getElementById('ext-test-timing');
            timingDiv.innerHTML = `
                <span class="icon">⏱️</span>
                <span class="duration">Runtime: ${duration} ms</span>
            `;

            renderExtensionResults(results);
        }

        // Run extension tests on page load
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(runExtensionTests, 500);
        });

        // ===========================================
        // AI Diagnostics
        // ===========================================

        const knownFailures = new Set([
            'should demonstrate interleaved success and failure expects'
        ]);

        function updateDiagnostics() {
            const output = document.getElementById('diagnostics-output');
            if (!output) return;

            const failures = [];

            // Collect DSL test failures
            if (typeof runner !== 'undefined' && runner.suites) {
                runner.suites.forEach(suite => {
                    suite.results.forEach(test => {
                        if (test.status === 'fail' && test.error && !knownFailures.has(test.name)) {
                            // Get DSL source from source map
                            const key = `${suite.name}:${test.name}`;
                            const sourceData = window.dslSourceMap?.[key];
                            const source = sourceData?.source?.replace(/\\n/g, '\n') || '';
                            const startLine = sourceData?.startLine || 0;

                            // Find which file contains this line
                            let fileInfo = '';
                            if (startLine && window.dslFileMap) {
                                const fileEntry = window.dslFileMap.find(f => startLine >= f.start && startLine <= f.end);
                                if (fileEntry) {
                                    const localLine = startLine - fileEntry.start + 1;
                                    fileInfo = `File: ${fileEntry.file}:${localLine}`;
                                }
                            }

                            failures.push(
                                `## ${test.name}\n` +
                                `Suite: ${suite.name}\n` +
                                (fileInfo ? `${fileInfo}\n` : '') +
                                `Error: ${test.error.message}\n` +
                                (source ? `\nDSL Source:\n${source}` : '')
                            );
                        }
                    });
                });
            }

            // Collect extension test failures
            if (typeof extRunner !== 'undefined' && extRunner.suites) {
                extRunner.suites.forEach(suite => {
                    suite.results.forEach(test => {
                        if (test.status === 'fail' && test.error) {
                            failures.push(`[Extension] ${suite.name}: ${test.name}\n${test.error.message}`);
                        }
                    });
                });
            }

            output.textContent = failures.length > 0
                ? failures.join('\n\n---\n\n')
                : 'No failures detected.';
        }

        function copyDiagnosticsText() {
            const output = document.getElementById('diagnostics-output');
            const btn = document.getElementById('copy-diagnostics-btn');
            navigator.clipboard.writeText(output.textContent).then(() => {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 1000);
            });
        }

        function toggleFailFast() {
            const checkbox = document.getElementById('fail-fast-checkbox');
            if (typeof runner !== 'undefined') {
                runner.failFast = checkbox.checked;
            }
            // Save preference
            localStorage.setItem('buffee-test-fail-fast', checkbox.checked);
        }

        // Restore fail-fast preference on load
        window.addEventListener('DOMContentLoaded', () => {
            const saved = localStorage.getItem('buffee-test-fail-fast') === 'true';
            const checkbox = document.getElementById('fail-fast-checkbox');
            if (checkbox) {
                checkbox.checked = saved;
                if (typeof runner !== 'undefined') {
                    runner.failFast = saved;
                }
            }
        });

        // Update diagnostics when switching to that tab
        document.querySelector('.tab[data-tab="diagnostics"]').addEventListener('click', updateDiagnostics);
