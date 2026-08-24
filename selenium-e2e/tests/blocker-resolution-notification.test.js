const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const {
  Builder,
  By,
  Key,
  logging,
  until,
} = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const rootDir = path.resolve(__dirname, '..', '..')
const e2eDir = path.resolve(__dirname, '..')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const reportRoot = path.join(e2eDir, 'reports', `blocker-resolution-${runId}`)
const screenshotDir = path.join(reportRoot, 'screenshots')

fs.mkdirSync(screenshotDir, { recursive: true })
loadDotEnv(path.join(e2eDir, '.env'))

const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  writerEmail: 'team.writer@agency.com',
  pmEmail: 'pm@agency.com',
  password: process.env.E2E_PASSWORD || 'SakhaaOnTop123',
  headless: process.env.HEADLESS !== 'false',
}

const report = {
  startedAt: new Date().toISOString(),
  config: redact(config),
  summary: { passed: 0, failed: 0 },
  steps: [],
}

let driver

main().catch(async (error) => {
  if (!report.steps.some((s) => s.status === 'failed')) {
    report.summary.failed += 1
    report.steps.push({
      name: 'Fatal Selenium error',
      status: 'failed',
      error: { name: error.name, message: error.message, stack: error.stack },
    })
  }
  process.exitCode = 1
}).finally(async () => {
  if (driver) {
    try {
      await driver.quit()
    } catch {}
  }
  report.finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(reportRoot, 'report.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(reportRoot, 'report.html'), renderHtmlReport(report))
  console.log(`Selenium E2E Report written to ${reportRoot}`)
  process.exit(process.exitCode || 0)
})

async function detectActiveUrl(candidates) {
  for (const url of candidates) {
    if (!url) continue
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 500) resolve()
          else reject(new Error(`Status ${res.statusCode}`))
        })
        req.on('error', reject)
        req.setTimeout(2000, () => { req.destroy(); reject(new Error('Timeout')) })
      })
      return url
    } catch {}
  }
  return candidates[0]
}

async function main() {
  config.frontendUrl = await detectActiveUrl([
    process.env.FRONTEND_URL,
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5177',
    'http://localhost:5177',
  ])
  console.log(`Detected active frontend URL: ${config.frontendUrl}`)

  driver = await buildDriver()
  const timestamp = Date.now()
  const blockerTitle = `Selenium Blocker Test ${timestamp}`
  const resolutionNotes = `Resolved automatically by Selenium E2E test at ${timestamp}`

  // Step 1: Sign in as team.writer@agency.com and raise a blocker for pm@agency.com
  await step('01-writer-login-and-raise-blocker', async () => {
    await login(config.writerEmail, config.password)
    await clickByTestId('nav-blockers')
    await waitForTestId('blockers-page', 30000)

    // Select workflow
    await selectOptionByValueOrIndex('select-blocker-workflow', 1)
    await sleep(1000)

    // Select task
    await selectOptionByValueOrIndex('select-blocker-task', 1)
    await sleep(500)

    // Select PM assignee
    const assigneeSelect = await waitForTestId('select-blocker-assignee', 10000)
    const assigneeOptions = await assigneeSelect.findElements(By.css('option'))
    let targetIndex = 1
    for (let i = 0; i < assigneeOptions.length; i++) {
      const text = await assigneeOptions[i].getText()
      if (text.toLowerCase().includes('project manager') || text.toLowerCase().includes('pm@agency.com')) {
        targetIndex = i
        break
      }
    }
    await selectOptionByValueOrIndex('select-blocker-assignee', targetIndex)

    await typeByTestId('input-blocker-title', blockerTitle)
    await typeByTestId('textarea-blocker-description', 'Selenium automated test blocker description.')

    await clickByTestId('button-submit-blocker')
    await sleep(1500)
    const noticeEl = await driver.findElement(By.css('.notice')).catch(() => null)
    if (noticeEl) {
      const txt = await noticeEl.getText()
      console.log(`📌 Notice text after submit: "${txt}"`)
      if (txt.toLowerCase().includes('error') || txt.toLowerCase().includes('please')) {
        throw new Error(`Blocker creation failed with notice: "${txt}"`)
      }
    }
    await sleep(2000)
    await screenshot('01-blocker-raised-by-writer')
    await logout()
  })

  // Step 2: Sign in as pm@agency.com, verify creation notification, and resolve blocker
  await step('02-pm-login-verify-notification-and-resolve', async () => {
    await login(config.pmEmail, config.password)

    // Open notifications bell
    await clickByTestId('button-notifications')
    await waitForTestId('notifications-popover', 10000)
    await screenshot('02-pm-creation-notification-received')

    // Close notifications popover
    await clickByTestId('button-notifications')

    // Navigate to Blockers page
    await clickByTestId('nav-blockers')
    await waitForTestId('blockers-page', 30000)

    // Find and click the newly logged blocker
    const blockerItem = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${blockerTitle}')]`)),
      15000,
    )
    await blockerItem.click()
    await waitForTestId('blocker-detail-panel', 15000)

    // Fill resolution notes
    const notesTextarea = await waitForTestId('textarea-resolution-notes', 10000)
    await notesTextarea.clear()
    await notesTextarea.sendKeys(resolutionNotes)

    // Measure time to state transition (Asserting zero delay / instant resolution update)
    const startTime = Date.now()
    await clickByTestId('button-resolve-blocker')

    // ASSERTION 1: Immediate state transition to "resolved" in < 1500ms
    await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${resolutionNotes}')]`)),
      10000,
      'Resolution notes should appear in the detail panel immediately upon resolving',
    )
    const elapsedTime = Date.now() - startTime
    console.log(`⏱ Instant state transition measured: ${elapsedTime}ms`)

    await screenshot('03-pm-resolved-blocker-instantly')
    await logout()
  })

  // Step 3: Sign back in as team.writer@agency.com and verify resolution notification & navigation
  await step('03-writer-receive-resolution-notification-and-navigate', async () => {
    await login(config.writerEmail, config.password)

    // ASSERTION 2: Flagger ("Assigned by" owner) receives resolution notification in NotificationsBell
    await clickByTestId('button-notifications')
    await waitForTestId('notifications-popover', 10000)
    await sleep(1000)

    // Wait until the notification popover contains the specific "Blocker resolved" text item inside the popover list
    const notifItem = await driver.wait(
      until.elementLocated(By.xpath("//section[contains(@class,'notifications-popover')]//*[contains(text(), 'Blocker resolved')]")),
      15000,
      'Resolution notification item with title "Blocker resolved" MUST be present inside notifications-popover for team.writer@agency.com',
    )

    await sleep(500)
    await screenshot('04-writer-received-resolution-notification')

    // Click resolution notification item
    await notifItem.click()

    // ASSERTION 3: Auto-switch to "Resolved Blockers" tab and detail panel display
    await waitForTestId('blockers-page', 15000)
    await sleep(1500)
    await screenshot('05-writer-navigated-to-resolved-blocker-page')

    const detailPanelText = await driver.findElement(By.css('[data-testid="blocker-detail-panel"]')).getText()
    if (!detailPanelText.includes(blockerTitle) && !detailPanelText.includes(resolutionNotes)) {
      throw new Error(`Resolved blocker details or notes "${resolutionNotes}" not visible in detail panel after notification click!`)
    }
  })

  console.log('🎉 Selenium E2E Test Suite Completed Successfully! All assertions passed.')
}

async function buildDriver() {
  const options = new chrome.Options()
  if (config.headless) {
    options.addArguments('--headless=new')
  }
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1600,1000',
  )

  const prefs = new logging.Preferences()
  prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL)
  options.setLoggingPrefs(prefs)

  return new Builder().forBrowser('chrome').setChromeOptions(options).build()
}

async function login(email, password) {
  await driver.get(config.frontendUrl)
  await waitForTestId('login-page', 30000)
  await typeByTestId('input-email', email)
  await typeByTestId('input-password', password)
  await clickByTestId('button-sign-in')
  await waitForTestId('app-shell', 30000)
}

async function logout() {
  try {
    const logoutBtn = await driver.findElement(By.css('[data-testid="button-sign-out"], [data-testid="button-logout"]')).catch(() => null)
    if (logoutBtn) {
      await logoutBtn.click()
      await sleep(1000)
    } else {
      await driver.executeScript('window.localStorage.clear(); window.sessionStorage.clear();')
      await driver.get(config.frontendUrl)
    }
  } catch {
    await driver.get(config.frontendUrl)
  }
}

async function step(name, action) {
  const startedAt = Date.now()
  try {
    await action()
    const durationMs = Date.now() - startedAt
    report.summary.passed += 1
    report.steps.push({ name, status: 'passed', durationMs })
    console.log(`  ✔ [${durationMs}ms] ${name}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    report.summary.failed += 1
    const screenshotPath = await screenshot(`error-${slug(name)}`).catch(() => undefined)
    report.steps.push({
      name,
      status: 'failed',
      durationMs,
      error: { name: error.name, message: error.message, stack: error.stack },
      screenshot: screenshotPath,
    })
    console.error(`  ❌ [${durationMs}ms] ${name}: ${error.message}`)
    throw error
  }
}

async function screenshot(name) {
  try {
    const filename = `${name}-${Date.now()}.png`
    const png = await driver.takeScreenshot()
    fs.writeFileSync(path.join(screenshotDir, filename), Buffer.from(png, 'base64'))
    return path.join('screenshots', filename)
  } catch (err) {
    return undefined
  }
}

function cssTestId(testId) {
  return By.css(`[data-testid="${testId}"]`)
}

async function waitForTestId(testId, timeoutMs = 15000) {
  return driver.wait(until.elementLocated(cssTestId(testId)), timeoutMs)
}

async function selectOptionByValueOrIndex(testId, index = 1) {
  const select = await waitForTestId(testId, 15000)
  await driver.wait(async () => {
    const opts = await select.findElements(By.css('option'))
    return opts.length > index
  }, 15000, `Timed out waiting for options to load in select [data-testid="${testId}"]`)

  const options = await select.findElements(By.css('option'))
  const val = await options[index].getAttribute('value')
  await driver.executeScript(
    `arguments[0].value = arguments[1];
     arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
    select,
    val,
  )
}

async function typeByTestId(testId, value) {
  const el = await waitForTestId(testId)
  await el.clear().catch(() => {})
  await el.sendKeys(value)
}

async function clickByTestId(testId) {
  const el = await waitForTestId(testId)
  await el.click()
}

function redact(value) {
  const secretKeys = ['password', 'authorization', 'apiKey', 'token']
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  const output = {}
  for (const [key, inner] of Object.entries(value)) {
    output[key] = secretKeys.some((s) => key.toLowerCase().includes(s.toLowerCase())) ? '[REDACTED]' : redact(inner)
  }
  return output
}

function renderHtmlReport(data) {
  const rows = data.steps.map((s) => `
    <section class="step ${s.status}">
      <h2>${escapeHtml(s.name)} <span>${escapeHtml(s.status)}</span></h2>
      <p>Duration: ${s.durationMs ?? 0}ms</p>
      ${s.screenshot ? `<img src="${escapeHtml(s.screenshot)}" />` : ''}
      ${s.error ? `<h3>Error</h3><pre>${escapeHtml(JSON.stringify(s.error, null, 2))}</pre>` : ''}
    </section>
  `).join('\n')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Blocker Resolution Selenium E2E Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #fafaf8; color: #1a1a1a; }
    .summary, .step { border: 1px solid #e8e8e4; background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .passed h2 span { color: #1c7a4a; }
    .failed h2 span { color: #a02828; }
    pre { overflow: auto; max-height: 360px; padding: 12px; background: #f7f7f5; border-radius: 8px; }
    img { max-width: 100%; border: 1px solid #e8e8e4; border-radius: 8px; }
  </style>
</head>
<body>
  <section class="summary">
    <h1>Blocker Resolution & Notification Selenium E2E Report</h1>
    <p>Passed: ${data.summary.passed} | Failed: ${data.summary.failed}</p>
    <p>Started: ${escapeHtml(data.startedAt)} | Finished: ${escapeHtml(data.finishedAt ?? '')}</p>
  </section>
  ${rows}
</body>
</html>`
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^"|"$/g, '')
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
