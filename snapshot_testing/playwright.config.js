// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  snapshotDir: './baselines',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'off',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: 'python3 -m http.server 8080 -d ..',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 50,  // Strict: fail if more than 50 pixels differ
    },
  },
});
