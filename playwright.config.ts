import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    navigationTimeout: 15000,
    actionTimeout: 10000,
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-features=site-per-process',
            '--renderer-process-limit=1',
            '--disable-accelerated-2d-canvas',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--mute-audio',
            '--hide-scrollbars',
            '--metrics-recording-only'
          ]
        }
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});