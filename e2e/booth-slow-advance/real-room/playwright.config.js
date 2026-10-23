import { defineConfig } from '@playwright/test'
// ROOM_WAV_DIR=<dir of .wav> E2E_BASE_URL=https://staging.popty.app npx playwright test e2e/booth-slow-advance/real-room/real-room.spec.js --config=e2e/booth-slow-advance/real-room/playwright.config.js
export default defineConfig({
  testDir: '.', timeout: 120_000, workers: 1, reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173', colorScheme: 'light' },
})
