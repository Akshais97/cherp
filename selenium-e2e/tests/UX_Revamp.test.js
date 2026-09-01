const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { execFileSync, spawn } = require('node:child_process')
const { Builder, By, Capabilities, Key, logging, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const rootDir = path.resolve(__dirname, '..', '..')
const e2eDir = path.resolve(__dirname, '..')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const reportRoot = path.join(e2eDir, 'reports', `ux-revamp-${runId}`)

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
  console.log(`UX Revamp reports written to ${reportRoot}`)
  process.exit(process.exitCode || 0)
})

async function main() {
  if (config.startServers) {
    await startServers()
  }

  // 1. Project Manager Journey (Dashboard Tabs, Completed Tasks Date Range, Search Results, Task Load Equation, Client Onboarding & TM Assignment)
  await runJourney('project_manager', { label: 'Project Manager', email: config.pmEmail }, async (ctx) => {
    await login(ctx, config.pmEmail, config.password)

    await step(ctx, 'Verify Project Manager Sidebar Visibility', async () => {
      await waitForTestId(ctx.driver, 'app-shell', 45000)
      
      // Should see dashboard, tasks, calendar, client-directory, brands, analytics, workflows, team-members, employee-profiles, blockers
      await waitForTestId(ctx.driver, 'nav-dashboard')
      await waitForTestId(ctx.driver, 'nav-tasks')
      await waitForTestId(ctx.driver, 'nav-calendar')
      await waitForTestId(ctx.driver, 'nav-client-directory')
      await waitForTestId(ctx.driver, 'nav-brands')
      await waitForTestId(ctx.driver, 'nav-analytics')
      await waitForTestId(ctx.driver, 'nav-workflows')
      await waitForTestId(ctx.driver, 'nav-team-members')
      await waitForTestId(ctx.driver, 'nav-employee-profiles')
      await waitForTestId(ctx.driver, 'nav-blockers')
      
      await screenshot(ctx, 'pm-sidebar-all-visible')
    })

    await step(ctx, 'Verify PM Dashboard Switchable Sub-Tabs', async () => {
      await clickByTestId(ctx.driver, 'nav-dashboard')
      await waitForTestId(ctx.driver, 'project_manager-dashboard-page', 15000)

      const todoTab = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'To Do')]"))
      const inProgressTab = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'In Progress')]"))
      const inReviewTab = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'In Review')]"))
      const completedTab = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Completed')]"))

      // Click each tab and check status
      await clickElement(ctx.driver, inProgressTab)
      if (!(await inProgressTab.getAttribute('class')).includes('active')) {
        throw new Error('In Progress tab is not active after click.')
      }

      await clickElement(ctx.driver, inReviewTab)
      if (!(await inReviewTab.getAttribute('class')).includes('active')) {
        throw new Error('In Review tab is not active after click.')
      }

      await clickElement(ctx.driver, completedTab)
      if (!(await completedTab.getAttribute('class')).includes('active')) {
        throw new Error('Completed tab is not active after click.')
      }

      // Check Completed Task date range filters (Daily, Weekly, Monthly)
      const dailyFilter = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Daily')]"))
      const weeklyFilter = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Weekly')]"))
      const monthlyFilter = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Monthly')]"))

      await clickElement(ctx.driver, dailyFilter)
      await clickElement(ctx.driver, monthlyFilter)
      await clickElement(ctx.driver, weeklyFilter)

      await screenshot(ctx, 'pm-subtabs-and-date-filters')
    })

    await step(ctx, 'Verify Global Search Suggestion Results', async () => {
      const searchInput = await ctx.driver.findElement(By.css('.search-box input'))
      await searchInput.sendKeys('Selenium')
      await sleep(1500) // wait for debounce search

      const dropdown = await ctx.driver.findElements(By.css('.search-dropdown'))
      if (dropdown.length === 0) {
        throw new Error('Global search suggestions dropdown not visible after query.')
      }

      await screenshot(ctx, 'search-suggestions-dropdown')
      await searchInput.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE)
      await sleep(500)
    })

    await step(ctx, 'Verify Team Member Task Load Equation', async () => {
      await clickByTestId(ctx.driver, 'nav-team-members')
      await waitForTestId(ctx.driver, 'team-members-page', 15000)

      // Click first member row
      const memberRow = await waitForTestId(ctx.driver, 'team-member-row', 15000)
      await clickElement(ctx.driver, memberRow)
      await waitForTestId(ctx.driver, 'team-member-detail-panel', 15000)

      // Verifies Task Load Analysis renders
      const overallTasks = await ctx.driver.findElement(By.xpath("//span[text()='Overall Tasks']/following-sibling::strong"))
      const loadIndex = await ctx.driver.findElement(By.xpath("//span[text()='Tasks Load Index']/following-sibling::strong"))
      const loadCapacity = await ctx.driver.findElement(By.xpath("//span[text()='Load Capacity']/following-sibling::span"))

      console.log(`Task Load analysis: Overall: ${await overallTasks.getText()}, Index: ${await loadIndex.getText()}, Capacity: ${await loadCapacity.getText()}`)

      await screenshot(ctx, 'team-member-task-load-equation')
    })

    await step(ctx, 'PM onboards a client and assigns a task to Team Member', async () => {
      await clickByTestId(ctx.driver, 'nav-clients')
      await waitForTestId(ctx.driver, 'clients-page', 30000)
      await seedTemplatesIfAvailable(ctx.driver)

      const clientName = `UX Revamp Client ${Date.now()}`
      await createClient(ctx.driver, clientName)

      await clickByTestId(ctx.driver, 'nav-workflows')
      await waitForTestId(ctx.driver, 'workflows-page', 30000)

      await typeByTestId(ctx.driver, 'input-workflow-search', clientName)
      await clickWorkflowRow(ctx.driver, clientName, 45000)
      await waitForTestId(ctx.driver, 'workflow-detail-panel', 30000)

      const usersList = await ctx.driver.executeScript(async (backendUrl) => {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-'))
        const session = JSON.parse(localStorage.getItem(key))
        const res = await fetch(`${backendUrl}/api/users`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        return res.json()
      }, config.backendUrl)

      const tmUser = usersList.find(u => u.email === config.tmEmail)
      if (!tmUser) {
        throw new Error(`Team Member user ${config.tmEmail} not found in user list!`)
      }
      const tmFullName = tmUser.full_name

      const taskTitle = `UX Revamp Task ${Date.now()}`
      await typeByTestId(ctx.driver, 'input-task-title', taskTitle)
      await setValueByTestId(ctx.driver, 'input-task-due-date', today())
      await clickByTestId(ctx.driver, 'button-create-task')
      await waitForTaskCardText(ctx.driver, taskTitle, 'Yet to start', 30000)

      await selectTaskCardOption(ctx.driver, taskTitle, 'select-task-card-assignee', tmFullName)
      await clickByTestId(ctx.driver, 'button-save-task')
      await sleep(1500)
      await screenshot(ctx, 'pm-task-assigned-to-tm')
    })

    await logout(ctx)
  })

  // 2. Team Member Journey (Permissions & Visibility, Search Placeholder, Quick Actions, Ripples)
  await runJourney('team_member', { label: 'Team Member', email: config.tmEmail }, async (ctx) => {
    await login(ctx, config.tmEmail, config.password)
    
    await step(ctx, 'Verify Sidebar Permissions for Team Member', async () => {
      await waitForTestId(ctx.driver, 'app-shell', 45000)
      
      // Hidden tabs: client-directory, analytics, employee-profiles, team-members
      const clientDir = await ctx.driver.findElements(cssTestId('nav-client-directory'))
      const analytics = await ctx.driver.findElements(cssTestId('nav-analytics'))
      const empProfiles = await ctx.driver.findElements(cssTestId('nav-employee-profiles'))
      const usersTab = await ctx.driver.findElements(cssTestId('nav-users'))
      const teamMembers = await ctx.driver.findElements(cssTestId('nav-team-members'))
      
      if (clientDir.length > 0 || analytics.length > 0 || empProfiles.length > 0 || usersTab.length > 0 || teamMembers.length > 0) {
        throw new Error('Team Member should not see client-directory, analytics, employee-profiles, users, or team-members tabs.')
      }

      // Visible tabs: dashboard, tasks, calendar, brands, workflows, blockers
      await waitForTestId(ctx.driver, 'nav-dashboard')
      await waitForTestId(ctx.driver, 'nav-tasks')
      await waitForTestId(ctx.driver, 'nav-calendar')
      await waitForTestId(ctx.driver, 'nav-brands')
      await waitForTestId(ctx.driver, 'nav-workflows')
      await waitForTestId(ctx.driver, 'nav-blockers')
      
      await screenshot(ctx, 'team-member-sidebar-correct')
    })

    await step(ctx, 'Verify Team Member Search Bar Placeholder', async () => {
      const searchInput = await ctx.driver.findElement(By.css('.search-box input'))
      const placeholder = await searchInput.getAttribute('placeholder')
      if (placeholder !== 'Search brands, tasks, blockers...') {
        throw new Error(`Expected Team Member placeholder to be "Search brands, tasks, blockers..." but got: "${placeholder}"`)
      }
      await screenshot(ctx, 'team-member-search-placeholder')
    })

    await step(ctx, 'Verify Team Member Quick Actions Buttons targets', async () => {
      // Request Approval -> navigates to tasks page
      const reqApprovalBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'Request Approval')]"))
      await clickElement(ctx.driver, reqApprovalBtn)
      await waitForTestId(ctx.driver, 'tasks-overview-page', 15000)

      // Nav back to dashboard
      await clickByTestId(ctx.driver, 'nav-dashboard')
      await waitForTestId(ctx.driver, 'team_member-dashboard-page', 15000)

      // View My Work -> navigates to tasks page
      const viewWorkBtn = await ctx.driver.findElement(By.xpath("//button[contains(text(), 'View My Work')]"))
      await clickElement(ctx.driver, viewWorkBtn)
      await waitForTestId(ctx.driver, 'tasks-overview-page', 15000)

      // Verify Tasks page brand select options and option groups
      const brandSelect = await ctx.driver.findElement(By.css('[data-testid="select-task-brand"]'))
      const optGroups = await brandSelect.findElements(By.css('optgroup'))
      if (optGroups.length === 0) {
        throw new Error('Expected brand select to have <optgroup> elements but found none.')
      }

      await screenshot(ctx, 'team-member-quick-actions-nav')
    })

    await step(ctx, 'Verify Position-Aware Hover Ripples', async () => {
      const logoutBtn = await ctx.driver.findElement(cssTestId('button-logout'))
      
      // Perform mouseover on logout button
      const actions = ctx.driver.actions({ async: true })
      await actions.move({ origin: logoutBtn }).perform()
      await sleep(500)
      
      const ripple = await logoutBtn.findElements(By.css('.btn-ripple'))
      if (ripple.length === 0) {
        throw new Error('Position-aware hover ripple element .btn-ripple not generated in logout button.')
      }

      await screenshot(ctx, 'hover-ripple-generated')
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
      await httpGet(url)
      return
    } catch {
      await sleep(1000)
    }
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function httpGet(rawUrl) {
  return new Promise((resolve, reject) => {
    const req = http.get(rawUrl, (res) => {
      res.resume()
      if (res.statusCode && res.statusCode < 500) resolve()
      else reject(new Error(`HTTP ${res.statusCode}`))
    })
    req.on('error', reject)
    req.setTimeout(3000, () => {
      req.destroy(new Error('Request timed out'))
    })
  })
}

function cssTestId(id) {
  return By.css(`[data-testid="${id}"]`)
}

async function waitForTestId(driver, id, timeoutMs = 15000) {
  const element = await driver.wait(until.elementLocated(cssTestId(id)), timeoutMs)
  await driver.wait(until.elementIsVisible(element), timeoutMs)
  return element
}

async function clickByTestId(driver, id) {
  const element = await waitForTestId(driver, id)
  await clickElement(driver, element)
}

async function clickElement(driver, element) {
  await driver.wait(until.elementIsEnabled(element), 15000)
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center", inline: "center" });', element)
  try {
    await element.click()
  } catch (error) {
    await driver.executeScript('arguments[0].click();', element)
  }
}

async function typeByTestId(driver, id, value) {
  const element = await waitForTestId(driver, id)
  await element.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE)
  if (value) await element.sendKeys(value)
}

async function setValueByTestId(driver, id, value) {
  const element = await waitForTestId(driver, id)
  await driver.executeScript(
    `
      const element = arguments[0];
      const value = arguments[1];
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    `,
    element,
    value,
  )
}

async function getVisibleText(driver) {
  try {
    return await driver.findElement(By.css('body')).getText()
  } catch {
    return ''
  }
}

async function screenshot(ctx, name) {
  try {
    const raw = await ctx.driver.takeScreenshot()
    const filename = `screenshot-${slug(name)}.png`
    const relativePath = path.join('screenshots', filename)
    const absolutePath = path.join(ctx.screenshotDir, filename)
    fs.writeFileSync(absolutePath, Buffer.from(raw, 'base64'))
    return relativePath
  } catch (error) {
    console.error(`Screenshot failed: ${error.message}`)
    return ''
  }
}

async function collectNetworkEvents(driver) {
  try {
    const entries = await driver.manage().logs().get(logging.Type.PERFORMANCE)
    return entries.map(parsePerformanceEntry).filter(Boolean).filter((event) => isRelevantUrl(event.url)).map(redact)
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
  <title>${escapeHtml(data.role)} UX Revamp Report</title>
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
    <h1>${escapeHtml(data.role)} UX Revamp Report</h1>
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

function normalizeSupabaseUrl(value) {
  if (!value) return value
  return value.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function datePlusDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function createClient(driver, clientName) {
  await waitForTestId(driver, 'onboarding-step-client-details', 30000)
  await typeByTestId(driver, 'input-client-name', clientName)
  await typeByTestId(driver, 'input-client-contact-email', `role.${Date.now()}@example.com`)
  await typeByTestId(driver, 'input-client-contact-name', 'Role Journey Tester')
  await typeByTestId(driver, 'input-client-retainer', '5000')
  await typeByTestId(driver, 'input-client-currency', 'INR')
  await setValueByTestId(driver, 'input-client-contract-start', today())
  await typeByTestId(driver, 'input-client-payment-terms', 'Net 15')
  await setValueByTestId(driver, 'input-client-renewal-date', datePlusDays(90))
  await clickByTestId(driver, 'button-onboarding-next-client-details')
  await waitForTestId(driver, 'onboarding-step-scope-templates', 30000)
  const select = await waitForTestId(driver, 'select-scope-template')
  const options = await select.findElements(By.css('option'))
  if (options.length < 2) throw new Error('No selectable scope templates were available.')
  await options[1].click()
  await waitForTestId(driver, 'template-preview-card', 30000)
  await clickByTestId(driver, 'button-onboarding-next-scope-templates')
  const teamMappingButtons = await driver.findElements(cssTestId('button-onboarding-next-team-mapping'))
  if (teamMappingButtons.length > 0) {
    await clickByTestId(driver, 'button-onboarding-next-team-mapping')
  }
  await waitForTestId(driver, 'onboarding-step-review', 30000)
  await waitForText(driver, clientName, 30000)
  await clickByTestId(driver, 'button-create-client')
  await waitForTestId(driver, 'alert-client-creation', 45000)
  await waitForText(driver, 'Client has been created', 30000)
}

async function seedTemplatesIfAvailable(driver) {
  const buttons = await driver.findElements(cssTestId('button-seed-templates'))
  if (buttons.length === 0) return
  await buttons[0].click()
  await waitUntilNoButtonText(driver, 'button-seed-templates', 'Seeding...', 45000)
}

async function waitUntilNoButtonText(driver, id, text, timeoutMs) {
  await driver.wait(async () => {
    try {
      const buttons = await driver.findElements(cssTestId(id))
      if (buttons.length === 0) return true
      return !(await buttons[0].getText()).includes(text)
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
      return false
    }
  }, timeoutMs)
}

async function waitForText(driver, text, timeoutMs) {
  await driver.wait(async () => (await driver.getPageSource()).includes(text), timeoutMs)
}

async function clickWorkflowRow(driver, workflowText, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('workflow-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(workflowText)) {
          await row.click()
          return true
        }
      } catch (error) {
        if (!String(error?.message || error).includes('stale element')) throw error
      }
    }
    return false
  }, timeoutMs)
}

async function findTaskCard(driver, taskTitle) {
  const cards = await driver.findElements(cssTestId('task-card'))
  for (const card of cards) {
    try {
      if ((await card.getText()).includes(taskTitle)) return card
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) throw error
    }
  }
  return undefined
}

async function ensureTaskCardOpen(driver, taskTitle) {
  const modals = await driver.findElements(By.css('.task-detail-modal'))
  if (modals.length > 0) {
    try {
      const titleInput = await driver.findElement(cssTestId('input-edit-task-title'))
      const currentTitle = await titleInput.getAttribute('value')
      if (currentTitle.trim() === taskTitle.trim()) {
        return true
      }
    } catch {
      // Ignore
    }
  }
  const card = await findTaskCard(driver, taskTitle)
  if (!card) return false
  await driver.wait(async () => {
    const backdrops = await driver.findElements(By.css('.modal-backdrop'))
    return backdrops.length === 0
  }, 5000)
  await card.click()
  await driver.wait(until.elementLocated(By.css('.task-detail-modal')), 10000)
  await sleep(250)
  return true
}

async function waitForTaskCardText(driver, taskTitle, text, timeoutMs) {
  await driver.wait(async () => {
    const card = await findTaskCard(driver, taskTitle)
    if (!card) return false
    try {
      return (await card.getText()).includes(text)
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) throw error
      return false
    }
  }, timeoutMs)
}

async function selectTaskCardOption(driver, taskTitle, testId, text) {
  await driver.wait(async () => {
    await ensureTaskCardOpen(driver, taskTitle)
    const select = await driver.findElement(cssTestId(testId))
    const options = await select.findElements(By.css('option'))
    for (const option of options) {
      if ((await option.getText()).trim() === text) {
        await option.click()
        return true
      }
    }
    throw new Error(`Option "${text}" not found in ${testId}.`)
  }, 30000)
}
