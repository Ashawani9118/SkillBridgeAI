
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',

  timeout: 90000,

  expect: {
    timeout: 15000,
  },

  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  reporter: 'list',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
