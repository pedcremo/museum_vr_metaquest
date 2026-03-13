/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: "tests/e2e",
  timeout: 30000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 150,
    },
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  },
};
