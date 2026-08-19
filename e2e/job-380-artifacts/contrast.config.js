import { defineConfig } from '@playwright/test'
import { BASE, conditionProject } from './playwright.config.js'

// THE CONTRAST. The same fixtures and the same spec, against the code BEFORE
// the microphone check existed.
//
// Set up a second worktree at origin/main and serve it:
//   git -C <repo> worktree add .worktrees/main-contrast origin/main
//   ln -s <prod>/node_modules .worktrees/main-contrast/node_modules
//   (cd .worktrees/main-contrast && npx vite --port 5179) &
//   E2E_BASE_URL=http://localhost:5179 E2E_LABEL=main \
//     npx playwright test --config=e2e/mic-calibration/contrast.config.js
//
// Only take-uncalibrated.spec.js runs here, because it is the only spec that
// mentions nothing the old code does not have. Its results land in
// e2e/mic-calibration/results/ next to the branch's, for a like-for-like read.
export default defineConfig({
  ...BASE,
  projects: [
    conditionProject('old-code-phone-breath800', 'phone', 800, /take-uncalibrated\.spec\.js/),
    conditionProject('old-code-external-breath800', 'external', 800, /take-uncalibrated\.spec\.js/),
    conditionProject('old-code-phone-breath1200', 'phone', 1200, /take-uncalibrated\.spec\.js/),
    conditionProject('old-code-external-breath1200', 'external', 1200, /take-uncalibrated\.spec\.js/),
  ],
})
