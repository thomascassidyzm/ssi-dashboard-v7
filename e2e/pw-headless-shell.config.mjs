// Wraps a booth e2e config so it runs on the installed headless shell rather than a
// pinned `channel: 'chromium'` build: E2E_WRAP=e2e/<dir>/playwright.config.js.
import path from 'path'
const file = path.resolve(process.env.E2E_WRAP)
const base = (await import(file)).default
const { channel, ...use } = base.use || {}
export default { ...base, testDir: path.resolve(path.dirname(file), base.testDir || '.'), use: { ...use, launchOptions: { ...(use.launchOptions || {}), executablePath: undefined } } }
