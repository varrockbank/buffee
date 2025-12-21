// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  // Root pages
  { name: 'index', path: '/' },
  { name: 'getting-started', path: '/web/getting-started.html' },
  { name: 'extensions', path: '/web/extensions.html' },
  { name: 'themes', path: '/web/themes.html' },
  { name: 'comparison', path: '/web/comparison.html' },

  // Samples
  { name: 'samples-index', path: '/samples/' },
  { name: 'samples-basic', path: '/samples/sample-basic.html' },
  { name: 'samples-gutter-status', path: '/samples/sample-gutter-status.html' },
  { name: 'samples-readonly', path: '/samples/sample-readonly.html' },
  { name: 'samples-sizing', path: '/samples/sample-sizing.html' },
  { name: 'samples-tui', path: '/samples/sample-tui.html' },
  { name: 'samples-elementals', path: '/samples/sample-elementals.html' },
  { name: 'samples-syntax', path: '/samples/sample-syntax.html' },
  { name: 'samples-ios', path: '/samples/sample-ios.html' },
  { name: 'samples-loader', path: '/samples/sample-loader.html' },
  { name: 'samples-movie', path: '/samples/sample-movie.html' },

  // Test pages
  { name: 'test-index', path: '/test/' },
  { name: 'test-extensions', path: '/test/#extensions' },
];

// Selectors for dynamic content to mask during screenshots
const dynamicSelectors = [
  '.duration',              // "Runtime: 40 ms"
  '.details',               // "(Started: 3:11:39 PM • Ended: 3:11:39 PM)"
  '#buffee-version',          // Version number on index.html
  '#hackernews .buffee-lines',  // Live HN content on index.html
];

for (const page of pages) {
  test(`screenshot: ${page.name}`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path);

    // Wait for any animations/loading to settle
    await browserPage.waitForTimeout(500);

    // Find dynamic elements to mask
    const mask = [];
    for (const selector of dynamicSelectors) {
      const elements = await browserPage.locator(selector).all();
      mask.push(...elements);
    }

    await expect(browserPage).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
      mask,
    });
  });
}
