// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Directory to always save actual screenshots for manual comparison
const actualsDir = path.join(__dirname, 'actuals');

const pages = [
  // Root pages
  { name: 'index', path: '/' },
  { name: 'getting-started', path: '/getting-started.html' },
  { name: 'extensions', path: '/extensions.html' },
  { name: 'themes', path: '/themes.html' },
  { name: 'comparison', path: '/comparison.html' },
  { name: 'performance', path: '/performance.html' },

  // Samples
  { name: 'samples-index', path: '/samples/' },
  { name: 'samples-basic-editor', path: '/samples/basic-editor.html' },
  { name: 'samples-gutter-status', path: '/samples/gutter-status.html' },
  { name: 'samples-read-only', path: '/samples/read-only.html' },
  { name: 'samples-sizing', path: '/samples/sizing.html' },
  { name: 'samples-tui-legacy', path: '/samples/tui-legacy.html' },
  { name: 'samples-elementals', path: '/samples/elementals.html' },
  { name: 'samples-syntax', path: '/samples/syntax.html' },
  { name: 'samples-ios', path: '/samples/ios.html' },
  { name: 'samples-ultra-high-capacity', path: '/samples/ultra-high-capacity.html' },
  { name: 'samples-ascii-movie', path: '/samples/ascii-movie.html' },

  // Test pages
  { name: 'test-index', path: '/test/' },
  { name: 'test-extensions', path: '/test/#extensions' },
];

// Selectors for dynamic content to mask during screenshots
const dynamicSelectors = [
  '.duration',              // "Runtime: 40 ms"
  '.details',               // "(Started: 3:11:39 PM • Ended: 3:11:39 PM)"
  '#vbuf-version',          // Version number on index.html
  '#hackernews .wb-lines',  // Live HN content on index.html
];

// Ensure actuals directory exists
test.beforeAll(async () => {
  if (!fs.existsSync(actualsDir)) {
    fs.mkdirSync(actualsDir, { recursive: true });
  }
});

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

    // Always save actual screenshot for manual comparison
    await browserPage.screenshot({
      path: path.join(actualsDir, `${page.name}.png`),
      fullPage: true,
      mask,
    });

    await expect(browserPage).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
      mask,
    });
  });
}
