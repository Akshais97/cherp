const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { execFileSync, spawn } = require('node:child_process')
const { Builder, By, Capabilities, Key, logging, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const rootDir = path.resolve(__dirname, '..', '..')
const e2eDir = path.resolve(__dirname, '..')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const reportRoot = path.join(e2eDir, 'reports', `planner-tasks-${runId}`)

loadDotEnv(path.join(e2eDir, '.env'))
const frontendEnv = readDotEnv(path.join(rootDir, 'frontend', '.env'))
const backendEnv = readDotEnv(path.join(rootDir, 'backend', '.env'))

const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5177',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3100',
  superAdminEmail: 'akshaiofficial97@gmail.com',
  pmEmail: 'akshaiindia97@gmail.com',
  tmEmail: 'akshairofficial@gmail.com',
  password: 'SakhaaOnTop123',
  headless: process.env.HEADLESS !== 'false',
  startServers: process.env.START_SERVERS !== 'false',
}

const children = []
const events = []

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => {
  stopServers()
  fs.mkdirSync(reportRoot, { recursive: true })
  fs.writeFileSync(path.join(reportRoot, 'events.json'), JSON.stringify(redact(events), null, 2))
  console.log(`Planner Tasks E2E reports written to ${reportRoot}`)
  process.exit(process.exitCode || 0)
})

async function main() {
  if (config.startServers) {
    await startServers()
  }

  await runJourney('planner_tasks_flow', { label: 'Planner Tasks E2E Workflow', email: config.pmEmail }, async (ctx) => {
    await login(ctx, config.pmEmail, config.password)

    await step(ctx, 'Navigate to Tasks Tab', async () => {
      await waitForTestId(ctx.driver, 'app-shell', 45000)
      await clickByTestId(ctx.driver, 'nav-tasks')
      await waitForTestId(ctx.driver, 'tasks-overview-page', 15000)
      await screenshot(ctx, 'tasks-tab-loaded')
    })

    await step(ctx, 'Toggle and Verify View Tabs (Grid, Board, Calendar, Charts)', async () => {
      // 1. Grid View (Default)
      const gridBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Grid')]"))
      await clickElement(ctx.driver, gridBtn)
      await sleep(1000)
      await screenshot(ctx, 'view-grid')

      // 2. Board View
      const boardBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Board')]"))
      await clickElement(ctx.driver, boardBtn)
      await sleep(1000)
      await screenshot(ctx, 'view-board')

      // 3. Calendar View
      const calendarBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Calendar')]"))
      await clickElement(ctx.driver, calendarBtn)
      await sleep(1000)
      await screenshot(ctx, 'view-calendar')

      // 4. Charts View
      const chartsBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Charts')]"))
      await clickElement(ctx.driver, chartsBtn)
      await sleep(1000)
      await screenshot(ctx, 'view-charts')

      // Switch back to Board
      await clickElement(ctx.driver, boardBtn)
      await sleep(500)
    })

    await step(ctx, 'Open Global Filter Popover and check brand/priority filters', async () => {
      const filterBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Filter')]"))
      await clickElement(ctx.driver, filterBtn)
      await sleep(500)
      await screenshot(ctx, 'filter-popover-open')

      // Click Priority filter category
      const priorityCatBtn = await ctx.driver.findElement(By.xpath("//button[span[text()='Priority']]"))
      await clickElement(ctx.driver, priorityCatBtn)
      await sleep(300)
      await screenshot(ctx, 'filter-popover-priority-cat')

      // Select 'High' priority checkbox
      const highPrioCheckbox = await ctx.driver.findElement(By.xpath("//label[span[text()='high']]/input[@type='checkbox']"))
      if (!(await highPrioCheckbox.isSelected())) {
        await clickElement(ctx.driver, highPrioCheckbox)
      }
      await sleep(500)
      await screenshot(ctx, 'filter-high-priority-applied')

      // Clear all filters
      const clearFiltersBtn = await ctx.driver.findElement(By.xpath("//button[text()='Clear All Filters']"))
      await clickElement(ctx.driver, clearFiltersBtn)
      await sleep(500)
      await clickElement(ctx.driver, filterBtn) // close popover
      await sleep(500)
    })

    await step(ctx, 'Create a New Task', async () => {
      const newTaskBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'New Task')]"))
      await clickElement(ctx.driver, newTaskBtn)
      await sleep(500)
      await screenshot(ctx, 'create-task-modal-open')

      const taskTitle = `Planner Test Task ${Date.now()}`
      const titleInput = await ctx.driver.findElement(By.css("input[placeholder='e.g. Schedule June Content Calendar']"))
      await titleInput.sendKeys(taskTitle)

      const createBtn = await ctx.driver.findElement(By.xpath("//button[text()='Create Task']"))
      await clickElement(ctx.driver, createBtn)
      await sleep(1500)
      await screenshot(ctx, 'task-created-board')
    })

    await logout(ctx)
  })
}

async function runJourney(roleKey, user, run) {
  const ctx = createContext(roleKey, user.label)
  ctx.driver = await buildDriver()
  try {
    await run(ctx)
  } catch (error) {
    if (!ctx.report.steps.some((item) => item.status === 'failed')) {
      ctx.report.summary.failed += 1
      ctx.report.steps.push({
        name: 'Fatal setup/runtime error',
        status: 'failed',
        error: serializeError(error),
        browserLogs: await collectBrowserLogs(ctx.driver),
        network: await collectNetworkEvents(ctx.driver),
        screenshot: await screenshot(ctx, 'fatal-error'),
      })
    }
    process.exitCode = 1
  } finally {
    if (ctx.driver) {
      try {
        await ctx.driver.quit()
      } catch {
        // Closed
      }
    }
    writeRoleReport(ctx)
  }
}

function createContext(roleKey, label) {
  const dir = path.join(reportRoot, roleKey)
  const screenshotDir = path.join(dir, 'screenshots')
  fs.mkdirSync(screenshotDir, { recursive: true })
  return {
    roleKey,
    label,
    dir,
    screenshotDir,
    report: {
      role: label,
      startedAt: new Date().toISOString(),
      config: redact({
        frontendUrl: config.frontendUrl,
        backendUrl: config.backendUrl,
        email: config.tmEmail,
        headless: config.headless,
      }),
      summary: { passed: 0, failed: 0 },
      steps: [],
    },
  }
}

async function step(ctx, name, run) {
  const startedAt = Date.now()
  const item = {
    name,
    status: 'running',
    startedAt: new Date().toISOString(),
    durationMs: 0,
    network: [],
    browserLogs: [],
  }
  ctx.report.steps.push(item)

  try {
    await run()
    item.network = await collectNetworkEvents(ctx.driver)
    item.browserLogs = await collectBrowserLogs(ctx.driver)
    item.status = 'passed'
    ctx.report.summary.passed += 1
  } catch (error) {
    item.status = 'failed'
    item.error = serializeError(error)
    item.visibleText = await getVisibleText(ctx.driver)
    item.screenshot = await screenshot(ctx, `failure-${slug(name)}`)
    ctx.report.summary.failed += 1
    throw error
  } finally {
    item.durationMs = Date.now() - startedAt
    if (item.network.length === 0) item.network = await collectNetworkEvents(ctx.driver)
    if (item.browserLogs.length === 0) item.browserLogs = await collectBrowserLogs(ctx.driver)
  }
}

async function buildDriver() {
  const options = new chrome.Options()
  options.addArguments('--window-size=1440,1000')
  options.addArguments('--disable-dev-shm-usage')
  options.addArguments('--no-sandbox')
  if (config.headless) {
    options.addArguments('--headless=new')
  }
  const capabilities = Capabilities.chrome()
  capabilities.set('goog:loggingPrefs', { browser: 'ALL', performance: 'ALL' })
  return new Builder()
    .forBrowser('chrome')
    .withCapabilities(capabilities)
    .setChromeOptions(options)
    .build()
}

async function login(ctx, email, password) {
  await ctx.driver.get(config.frontendUrl)
  await waitForTestId(ctx.driver, 'login-page', 30000)
  await typeByTestId(ctx.driver, 'input-email', email)
  await typeByTestId(ctx.driver, 'input-password', password)
  await clickByTestId(ctx.driver, 'button-sign-in')
}

async function logout(ctx) {
  await clickByTestId(ctx.driver, 'button-logout')
  await waitForTestId(ctx.driver, 'login-page', 30000)
}

async function startServers() {
  const backend = spawnNpm('backend', ['run', 'start:dev'], path.join(rootDir, 'backend'))
  const frontend = spawnNpm('frontend', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(new URL(config.frontendUrl).port), '--strictPort'], path.join(rootDir, 'frontend'))
  children.push(backend, frontend)
  await waitForHttp(`${config.backendUrl}/api/docs`, 60000)
  await waitForHttp(config.frontendUrl, 60000)
}

function stopServers() {
  for (const child of children) {
    if (!child.pid) continue
    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
      } else {
        child.kill('SIGTERM')
      }
    } catch {
      child.kill()
    }
  }
}

function spawnNpm(name, args, cwd) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const env = buildChildEnv(name)
  const child = spawn(command, args, {
    cwd,
    env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout.on('data', (chunk) => {
    events.push({ source: name, stream: 'stdout', message: chunk.toString() })
  })
  child.stderr.on('data', (chunk) => {
    events.push({ source: name, stream: 'stderr', message: chunk.toString() })
  })
  return child
}

function buildChildEnv(name) {
  if (name === 'backend') {
    return {
      ...backendEnv,
      ...process.env,
      PORT: String(new URL(config.backendUrl).port),
      FRONTEND_ORIGIN: config.frontendUrl,
      SUPABASE_URL: normalizeSupabaseUrl(process.env.SUPABASE_URL || frontendEnv.VITE_SUPABASE_URL || backendEnv.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || backendEnv.SUPABASE_SERVICE_ROLE_KEY,
    }
  }
  return {
    ...frontendEnv,
    ...process.env,
    VITE_API_BASE_URL: `${config.backendUrl}/api`,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || frontendEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || frontendEnv.VITE_SUPABASE_ANON_KEY,
  }
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve()
          else reject(new Error(`Status code: ${res.statusCode}`))
        })
        req.on('error', reject)
        req.end()
      })
      return
    } catch {
      await sleep(1000)
    }
  }
  throw new Error(`Timed out waiting for HTTP service at ${url}`)
}

async function screenshot(ctx, name) {
  try {
    const filename = `${name}-${Date.now()}.png`
    const png = await ctx.driver.takeScreenshot()
    fs.writeFileSync(path.join(ctx.screenshotDir, filename), Buffer.from(png, 'base64'))
    return path.join('screenshots', filename)
  } catch (err) {
    console.error(`Failed to capture screenshot: ${err.message}`)
    return undefined
  }
}

async function collectNetworkEvents(driver) {
  try {
    const logs = await driver.manage().logs().get(logging.Type.PERFORMANCE)
    return logs
      .map((log) => parsePerformanceEntry(log))
      .filter((entry) => entry && isRelevantUrl(entry.url))
  } catch {
    return []
  }
}

async function collectBrowserLogs(driver) {
  try {
    const entries = await driver.manage().logs().get(logging.Type.BROWSER)
    return entries.map((entry) => redact({ level: entry.level.name, message: entry.message, timestamp: entry.timestamp }))
  } catch {
    return []
  }
}

function parsePerformanceEntry(entry) {
  try {
    const message = JSON.parse(entry.message).message
    const method = message.method
    const params = message.params
    if (method === 'Network.requestWillBeSent') {
      return {
        type: 'request',
        requestId: params.requestId,
        method: params.request.method,
        url: params.request.url,
        headers: params.request.headers,
        postData: parseMaybeJson(params.request.postData),
      }
    }
    if (method === 'Network.responseReceived') {
      return {
        type: 'response',
        requestId: params.requestId,
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText,
        mimeType: params.response.mimeType,
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

function isRelevantUrl(url) {
  return url && (url.startsWith(config.frontendUrl) || url.startsWith(config.backendUrl) || url.includes('.supabase.co'))
}

function writeRoleReport(ctx) {
  ctx.report.finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(ctx.dir, 'report.json'), JSON.stringify(ctx.report, null, 2))
  fs.writeFileSync(path.join(ctx.dir, 'report.html'), renderHtmlReport(ctx.report))
}

function renderHtmlReport(data) {
  const rows = data.steps.map((step) => `
    <section class="step ${step.status}">
      <h2>${escapeHtml(step.name)} <span>${escapeHtml(step.status)}</span></h2>
      <p>Duration: ${step.durationMs ?? 0}ms</p>
      ${step.screenshot ? `<img src="${escapeHtml(step.screenshot)}" />` : ''}
      <h3>Error</h3>
      <pre>${escapeHtml(JSON.stringify(step.error ?? null, null, 2))}</pre>
      <h3>Visible Page Text</h3>
      <pre>${escapeHtml(step.visibleText ?? '')}</pre>
      <h3>Network Events</h3>
      <pre>${escapeHtml(JSON.stringify(step.network ?? [], null, 2))}</pre>
      <h3>Browser Logs</h3>
      <pre>${escapeHtml(JSON.stringify(step.browserLogs ?? [], null, 2))}</pre>
    </section>
  `).join('\n')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.role)} Planner Tasks E2E Report</title>
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
    <h1>${escapeHtml(data.role)} Planner Tasks E2E Report</h1>
    <p>Passed: ${data.summary.passed} | Failed: ${data.summary.failed}</p>
    <p>Started: ${escapeHtml(data.startedAt)} | Finished: ${escapeHtml(data.finishedAt ?? '')}</p>
  </section>
  ${rows}
</body>
</html>`
}

function parseMaybeJson(value) {
  if (!value) return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function redact(value) {
  const secretKeys = ['password', 'authorization', 'apikey', 'apiKey', 'access_token', 'refresh_token', 'token']
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  const output = {}
  for (const [key, inner] of Object.entries(value)) {
    output[key] = secretKeys.some((secret) => key.toLowerCase().includes(secret.toLowerCase())) ? '[REDACTED]' : redact(inner)
  }
  return output
}

function serializeError(error) {
  return { name: error?.name, message: error?.message || String(error), stack: error?.stack }
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function loadDotEnv(file) {
  for (const [key, value] of Object.entries(readDotEnv(file))) {
    if (!process.env[key]) process.env[key] = value
  }
}

function readDotEnv(file) {
  if (!fs.existsSync(file)) return {}
  const values = {}
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    values[key] = rest.join('=').replace(/^"|"$/g, '')
  }
  return values
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function typeByTestId(driver, testId, value) {
  const el = await waitForTestId(driver, testId)
  await el.sendKeys(value)
}

async function clickByTestId(driver, testId) {
  const el = await waitForTestId(driver, testId)
  await el.click()
}

async function clickElement(driver, element) {
  await driver.wait(until.elementIsVisible(element))
  await element.click()
}

function cssTestId(testId) {
  return By.css(`[data-testid="${testId}"]`)
}

async function waitForTestId(driver, testId, timeoutMs = 15000) {
  return driver.wait(until.elementLocated(cssTestId(testId)), timeoutMs)
}

async function getVisibleText(driver) {
  try {
    return await driver.findElement(By.css('body')).getText()
  } catch {
    return ''
  }
}

function normalizeSupabaseUrl(value) {
  if (!value) return value
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  return `https://${value}`
}
