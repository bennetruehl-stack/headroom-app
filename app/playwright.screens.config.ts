import { defineConfig, devices } from '@playwright/test';

// Erzeugt Review-Screenshots unter ../screenshots. Aufruf: npm run screenshots
export default defineConfig({
  testDir: './e2e-screens',
  use: { baseURL: 'http://127.0.0.1:5173', ...devices['Desktop Chrome'], deviceScaleFactor: 2 },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
