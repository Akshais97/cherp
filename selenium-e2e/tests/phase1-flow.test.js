const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { execFileSync, spawn } = require('node:child_process')
const {
  Builder,
  By,
  Capabilities,
  Key,
  logging,
  until,
} = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const rootDir = path.resolve(__dirname, '..', '..')
const e2eDir = path.resolve(__dirname, '..')
const reportDir = path.join(
  e2eDir,
  'reports',
  new Date().toISOString().replace(/[:.]/g, '-'),
)
const screenshotDir = path.join(reportDir, 'screenshots')

fs.mkdirSync(screenshotDir, { recursive: true })
loadDotEnv(path.join(e2eDir, '.env'))
const frontendEnv = readDotEnv(path.join(rootDir, 'frontend', '.env'))
const backendEnv = readDotEnv(path.join(rootDir, 'backend', '.env'))

const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5177',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3100',
  email: process.env.E2E_EMAIL,
  password: process.env.E2E_PASSWORD,
  headless: process.env.HEADLESS !== 'false',
  startServers: process.env.START_SERVERS !== 'false',
  runPasswordReset: process.env.RUN_PASSWORD_RESET === 'true',
}

const report = {
  startedAt: new Date().toISOString(),
  config: redact(config),
  summary: { passed: 0, failed: 0 },
  steps: [],
}
const events = []
const children = []
let driver
let selectedTemplateName = ''
let createdClientName = ''
let createdTaskTitle = ''
let createdBlockerTitle = ''

main().catch(async (error) => {
  if (!report.steps.some((step) => step.status === 'failed')) {
    await recordFatal(error)
  }
  process.exitCode = 1
}).finally(async () => {
  if (driver) {
    try {
      await driver.quit()
    } catch {
      // Browser may already be closed.
    }
  }

  stopServers()

  writeReports()
  process.exit(process.exitCode || 0)
})

async function main() {
  if (!config.email || !config.password) {
    throw new Error('E2E_EMAIL and E2E_PASSWORD are required.')
  }

  if (config.startServers) {
    await startServers()
  }

  driver = await buildDriver()

  await step('Login page loads', {}, async () => {
    await driver.get(config.frontendUrl)
    await waitForTestId('login-page', 30000)
    await assertNoHorizontalOverflow()
    await screenshot('01-login-page')
  })

  await step(
    'Sign in with Supabase credentials',
    { email: config.email, password: config.password },
    async () => {
      await typeByTestId('input-email', config.email)
      await typeByTestId('input-password', config.password)
      await clickByTestId('button-sign-in')
      await waitForTestId('app-shell', 45000)
      await assertNoHorizontalOverflow()
      await screenshot('02-dashboard-after-login')
    },
  )

  await step('Dashboard metrics and buttons load', {}, async () => {
    await waitForTestId('dashboard-page')
    await waitForTestId('dashboard-metrics')
    await waitForTestId('metric-active-clients')
    await waitForTestId('metric-active-workflows')
    await waitForTestId('metric-avg-completion')
    await waitForTestId('dashboard-client-health-panel')
    await waitForTestId('dashboard-deadlines-panel')
    await waitForTestId('dashboard-open-blockers-panel')
    await waitForTestId('dashboard-activity-panel')
    await waitForTestId('dashboard-quick-filters')
    await setValueByTestId('input-dashboard-date-from', datePlusDays(-7))
    await setValueByTestId('input-dashboard-date-to', datePlusDays(14))
    await clickByTestId('button-toggle-sidebar')
    await assertNoHorizontalOverflow()
    await clickByTestId('button-toggle-sidebar')
    await assertNoHorizontalOverflow()
    await clickByTestId('button-dashboard-view-all')
    await screenshot('03-dashboard-metrics')
  })

  await step('Clients screen loads clients and templates', {}, async () => {
    await clickByTestId('nav-clients')
    await waitForTestId('clients-page', 30000)
    await waitForTestId('client-directory', 30000)
    const seedButtons = await driver.findElements(cssTestId('button-seed-templates'))
    if (seedButtons.length > 0) {
      try {
        await seedButtons[0].click()
        await waitUntilNoButtonText('button-seed-templates', 'Seeding...', 45000)
      } catch (error) {
        if (!String(error?.message || error).includes('stale element')) {
          throw error
        }
      }
    }
    await waitForNonEmptySelect('select-scope-template', 45000)
    await assertNoHorizontalOverflow()
    await screenshot('04-clients-loaded')
  })

  await step('Scope template preview shows tasks, KPIs, and duration', {}, async () => {
    const select = await waitForTestId('select-scope-template')
    const options = await select.findElements(By.css('option'))
    if (options.length < 2) {
      throw new Error('No selectable scope templates were available.')
    }
    selectedTemplateName = await options[1].getText()
    await options[1].click()
    await waitForTestId('template-preview-card')
    await screenshot('05-template-preview')
  })

  await step('Create client and Month 1 workflow', {}, async () => {
    createdClientName = `Selenium Client ${Date.now()}`
    const payload = {
      name: createdClientName,
      contact_email: `selenium.${Date.now()}@example.com`,
      contact_name: 'Selenium Tester',
      monthly_retainer: 5000,
      currency: 'INR',
      contract_start: today(),
      payment_terms: 'Net 15',
      renewal_date: datePlusDays(90),
      selected_template: selectedTemplateName,
    }
    await typeByTestId('input-client-name', payload.name)
    await typeByTestId('input-client-contact-email', payload.contact_email)
    await typeByTestId('input-client-contact-name', payload.contact_name)
    await typeByTestId('input-client-retainer', String(payload.monthly_retainer))
    await typeByTestId('input-client-currency', payload.currency)
    await setValueByTestId('input-client-contract-start', payload.contract_start)
    await typeByTestId('input-client-payment-terms', payload.payment_terms)
    await setValueByTestId('input-client-renewal-date', payload.renewal_date)
    await clickByTestId('button-create-client')
    await waitForClientRow(createdClientName, 45000)
    await screenshot('06-client-created')
    return payload
  })

  await step('Workflow detail task edit and blocker creation', {}, async () => {
    const taskTitle = `Selenium Task ${Date.now()}`
    const editedTaskTitle = `${taskTitle} Edited`
    createdBlockerTitle = `Selenium blocker ${Date.now()}`
    createdTaskTitle = editedTaskTitle
    await clickByTestId('nav-workflows')
    await waitForTestId('workflows-page', 30000)
    await typeByTestId('input-workflow-search', createdClientName)
    await clickWorkflowRow(createdClientName, 30000)
    await waitForTestId('workflow-detail-panel', 30000)
    await waitForTestId('task-checklist', 30000)
    await typeByTestId('input-task-title', taskTitle)
    await setValueByTestId('input-task-due-date', today())
    await clickByTestId('button-create-task')
    await waitForTaskCardText(taskTitle, 'Pending', 30000)
    await typeTaskCardField(taskTitle, 'input-edit-task-title', editedTaskTitle)
    await typeTaskCardField(
      taskTitle,
      'textarea-edit-task-description',
      'Edited by Slice 3 Selenium coverage',
    )
    await setTaskCardValue(taskTitle, 'input-edit-task-due-date', datePlusDays(1))
    await selectTaskCardOption(taskTitle, 'select-edit-task-priority', 'High')
    await clickTaskCardButton(taskTitle, 'button-save-task')
    await waitForTaskCardText(editedTaskTitle, 'Edited by Slice 3 Selenium coverage', 30000)
    await waitForTaskCardText(editedTaskTitle, 'High', 30000)
    await dragTaskToFirstAvailable(editedTaskTitle)
    await selectTaskCardOption(editedTaskTitle, 'select-task-status', 'In progress')
    await waitForTaskCardText(editedTaskTitle, 'In progress', 30000)
    await typeTaskCardField(editedTaskTitle, 'input-blocker-title', createdBlockerTitle)
    await typeTaskCardField(
      editedTaskTitle,
      'textarea-blocker-description',
      'Selenium blocker coverage',
    )
    await selectTaskCardOption(editedTaskTitle, 'select-blocker-severity', 'High')
    await typeTaskCardField(editedTaskTitle, 'input-blocker-impact', 'Cannot complete task')
    await clickTaskCardButton(editedTaskTitle, 'button-create-blocker')
    await waitForTaskCardText(editedTaskTitle, 'Blocked', 30000)
    await waitForTaskCardText(editedTaskTitle, '1 blockers', 30000)
    await assertNoHorizontalOverflow()
    await screenshot('07-workflow-task-blocked')
    return { taskTitle: editedTaskTitle }
  })

  await step('Blocker list detail and resolution', {}, async () => {
    await clickByTestId('nav-blockers')
    await waitForTestId('blockers-page', 30000)
    await waitForTestId('blocker-list', 30000)
    await waitForText(createdBlockerTitle, 30000)
    await clickBlockerRow(createdBlockerTitle, 30000)
    await waitForTestId('blocker-detail-panel', 30000)
    await waitForTestId('blocker-timeline', 30000)
    await typeByTestId('textarea-resolution-notes', 'Resolved by Selenium coverage')
    await clickByTestId('button-resolve-blocker')
    await waitForText('Resolved by Selenium coverage', 30000)
    await assertNoHorizontalOverflow()
    await screenshot('08-blocker-resolved')
  })

  await step('Complete unblocked workflow task', {}, async () => {
    await clickByTestId('nav-workflows')
    await waitForTestId('workflows-page', 30000)
    await typeByTestId('input-workflow-search', createdClientName)
    await clickWorkflowRow(createdClientName, 30000)
    await waitForTaskCardText(createdTaskTitle, 'In progress', 30000)
    await ensureTaskCardOpen(createdTaskTitle)
    await clickTaskCardButton(createdTaskTitle, 'button-complete-task')
    await waitForTaskCardText(createdTaskTitle, 'Completed', 30000)
    await assertNoHorizontalOverflow()
    await screenshot('09-workflow-task-executed')
    return { taskTitle: createdTaskTitle }
  })

  await step('Search and open client detail', {}, async () => {
    await clickByTestId('nav-clients')
    await waitForTestId('clients-page', 30000)
    await typeByTestId('input-client-search', createdClientName)
    await clickClientRow(createdClientName, 30000)
    await waitForTestId('client-detail-panel')
    await screenshot('10-client-detail')
  })

  await step('Edit client profile', {}, async () => {
    const editedName = `${createdClientName} Edited`
    await typeByTestId('input-edit-client-name', editedName)
    await typeByTestId('input-edit-client-payment-terms', 'Advance monthly')
    await setValueByTestId('input-edit-client-renewal-date', datePlusDays(120))
    await clickByTestId('button-save-client')
    await waitForText(editedName, 30000)
    createdClientName = editedName
    await screenshot('11-client-edited')
    return { name: editedName }
  })

  await step('Change client status to paused and back to active', {}, async () => {
    await selectByVisibleText('select-client-detail-status', 'Paused')
    await waitForSelectValue('select-client-detail-status', 'paused', 30000)
    await selectByVisibleText('select-client-detail-status', 'Active')
    await waitForSelectValue('select-client-detail-status', 'active', 30000)
    await screenshot('12-client-status')
  })

  await step('Archive created test client and verify archived filter', {}, async () => {
    await clickByTestId('button-archive-client')
    await waitForText('Archived', 30000)
    await typeByTestId('input-client-search', createdClientName)
    await selectByVisibleText('select-client-status-filter', 'Archived')
    await waitForClientRow(createdClientName, 30000)
    await screenshot('13-client-archived')
  })

  await step('Logout returns to login page', {}, async () => {
    await clickByTestId('button-logout')
    await waitForTestId('login-page', 30000)
    await screenshot('14-logout')
  })

  if (config.runPasswordReset) {
    await step('Password reset email action delegates to API', { email: config.email }, async () => {
      await typeByTestId('input-email', config.email)
      await clickByTestId('button-password-reset')
      await waitForText('password reset email', 30000)
      await screenshot('13-password-reset')
    })
  }
}

async function step(name, payload, run) {
  const startedAt = Date.now()
  const item = {
    name,
    status: 'running',
    payload: redact(payload),
    startedAt: new Date().toISOString(),
    durationMs: 0,
    network: [],
    browserLogs: [],
  }
  report.steps.push(item)

  try {
    const returnedPayload = await run()
    if (returnedPayload) {
      item.payload = redact(returnedPayload)
    }
    item.network = await collectNetworkEvents()
    item.browserLogs = await collectBrowserLogs()
    assertNoRuntimeErrors(item)
    item.status = 'passed'
    report.summary.passed += 1
  } catch (error) {
    item.status = 'failed'
    item.error = serializeError(error)
    item.visibleText = await getVisibleText()
    item.screenshot = await screenshot(`failure-${slug(name)}`)
    report.summary.failed += 1
    throw error
  } finally {
    item.durationMs = Date.now() - startedAt
    if (item.network.length === 0) {
      item.network = await collectNetworkEvents()
    }
    if (item.browserLogs.length === 0) {
      item.browserLogs = await collectBrowserLogs()
    }
  }
}

function assertNoRuntimeErrors(item) {
  const failedNetwork = (item.network || []).filter((event) => {
    if (event.type !== 'response' || event.status < 400) return false
    return event.url.includes('/api/') || event.url.includes('/auth/v1/')
  })
  const severeLogs = (item.browserLogs || []).filter((entry) => {
    if (entry.level !== 'SEVERE') return false
    return entry.message.includes('/api/') || entry.message.includes('CORS')
  })

  if (failedNetwork.length > 0 || severeLogs.length > 0) {
    item.detectedRuntimeErrors = { failedNetwork, severeLogs }
    throw new Error(
      `Runtime errors detected during "${item.name}". See detectedRuntimeErrors in report.json.`,
    )
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
  capabilities.set('goog:loggingPrefs', {
    browser: 'ALL',
    performance: 'ALL',
  })

  return new Builder()
    .forBrowser('chrome')
    .withCapabilities(capabilities)
    .setChromeOptions(options)
    .build()
}

async function startServers() {
  const backend = spawnNpm('backend', ['run', 'start:dev'], path.join(rootDir, 'backend'))
  const frontend = spawnNpm(
    'frontend',
    [
      'run',
      'dev',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(new URL(config.frontendUrl).port),
      '--strictPort',
    ],
    path.join(rootDir, 'frontend'),
  )

  children.push(backend, frontend)
  await waitForHttp(`${config.backendUrl}/api/docs`, 60000)
  await waitForHttp(config.frontendUrl, 60000)
}

function stopServers() {
  for (const child of children) {
    if (!child.pid) continue

    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        })
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
      SUPABASE_URL: normalizeSupabaseUrl(
        process.env.SUPABASE_URL ||
          frontendEnv.VITE_SUPABASE_URL ||
          backendEnv.SUPABASE_URL,
      ),
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        backendEnv.SUPABASE_SERVICE_ROLE_KEY,
    }
  }

  return {
    ...frontendEnv,
    ...process.env,
    VITE_API_BASE_URL: `${config.backendUrl}/api`,
    VITE_SUPABASE_URL:
      process.env.VITE_SUPABASE_URL || frontendEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:
      process.env.VITE_SUPABASE_ANON_KEY || frontendEnv.VITE_SUPABASE_ANON_KEY,
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

async function waitForTestId(id, timeoutMs = 15000) {
  const element = await driver.wait(until.elementLocated(cssTestId(id)), timeoutMs)
  await driver.wait(until.elementIsVisible(element), timeoutMs)
  return element
}

async function clickByTestId(id) {
  const element = await waitForTestId(id)
  await driver.wait(until.elementIsEnabled(element), 15000)
  await driver.executeScript(
    'arguments[0].scrollIntoView({ block: "center", inline: "center" });',
    element,
  )

  try {
    await element.click()
  } catch (error) {
    if (!String(error?.message || error).includes('element click intercepted')) {
      throw error
    }
    await driver.executeScript('arguments[0].click();', element)
  }
}

async function typeByTestId(id, value) {
  const element = await waitForTestId(id)
  await element.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE)
  if (value) await element.sendKeys(value)
}

async function setValueByTestId(id, value) {
  const element = await waitForTestId(id)
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

async function selectByVisibleText(id, text) {
  const select = await waitForTestId(id)
  await driver.executeScript(
    'arguments[0].scrollIntoView({ block: "center", inline: "center" });',
    select,
  )
  const options = await select.findElements(By.css('option'))
  for (const option of options) {
    if ((await option.getText()).trim() === text) {
      await option.click()
      return
    }
  }
  throw new Error(`Option "${text}" not found in ${id}.`)
}

async function waitForSelectValue(id, value, timeoutMs) {
  await driver.wait(async () => {
    const select = await driver.findElement(cssTestId(id))
    return (await select.getAttribute('value')) === value
  }, timeoutMs)
}

async function waitForText(text, timeoutMs) {
  await driver.wait(async () => (await driver.getPageSource()).includes(text), timeoutMs)
}

async function waitForClientRow(clientName, timeoutMs) {
  const row = await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('client-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(clientName)) return row
      } catch (error) {
        if (!String(error?.message || error).includes('stale element')) {
          throw error
        }
      }
    }
    return false
  }, timeoutMs)

  if (row) return row
  throw new Error(`Client row "${clientName}" not found.`)
}

async function clickWorkflowRow(workflowText, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('workflow-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(workflowText)) {
          await row.click()
          return true
        }
      } catch (error) {
        if (!String(error?.message || error).includes('stale element')) {
          throw error
        }
      }
    }
    return false
  }, timeoutMs)
}

async function waitForTaskCardText(taskTitle, text, timeoutMs) {
  await driver.wait(async () => {
    const card = await findTaskCard(taskTitle)
    if (!card) return false
    try {
      return (await card.getText()).includes(text)
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
      return false
    }
  }, timeoutMs)
}

async function selectTaskCardOption(taskTitle, testId, text) {
  await driver.wait(async () => {
    await ensureTaskCardOpen(taskTitle)
    const card = await findTaskCard(taskTitle)
    if (!card) return false
    try {
      const select = await card.findElement(cssTestId(testId))
      const options = await select.findElements(By.css('option'))
      for (const option of options) {
        if ((await option.getText()).trim() === text) {
          await option.click()
          return true
        }
      }
      throw new Error(`Option "${text}" not found in ${testId}.`)
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
      return false
    }
  }, 30000)
}

async function clickTaskCardButton(taskTitle, testId) {
  await driver.wait(async () => {
    await ensureTaskCardOpen(taskTitle)
    const card = await findTaskCard(taskTitle)
    if (!card) return false
    try {
      const button = await card.findElement(cssTestId(testId))
      if (!(await button.isEnabled())) return false
      await button.click()
      return true
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
      return false
    }
  }, 30000)
}

async function typeTaskCardField(taskTitle, testId, value) {
  await driver.wait(async () => {
    await ensureTaskCardOpen(taskTitle)
    const card = await findTaskCard(taskTitle)
    if (!card) return false
    try {
      const element = await card.findElement(cssTestId(testId))
      await element.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE)
      if (value) await element.sendKeys(value)
      return true
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
      return false
    }
  }, 30000)
}

async function setTaskCardValue(taskTitle, testId, value) {
  await driver.wait(async () => {
    await ensureTaskCardOpen(taskTitle)
    const card = await findTaskCard(taskTitle)
    if (!card) return false
    try {
      const element = await card.findElement(cssTestId(testId))
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
      return true
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
      return false
    }
  }, 30000)
}

async function dragTaskToFirstAvailable(taskTitle) {
  await driver.wait(async () => {
    const source = await findTaskCard(taskTitle)
    if (!source) return false
    const cards = await driver.findElements(cssTestId('task-card'))
    const sourceId = await source.getId()
    let target
    for (const card of cards) {
      if ((await card.getId()) !== sourceId) {
        target = card
        break
      }
    }
    if (!target) return true

    try {
      const handle = await source.findElement(cssTestId('button-task-drag-handle'))
      await driver.executeScript(
        `
          const handle = arguments[0];
          const target = arguments[1];
          const dataTransfer = new DataTransfer();
          handle.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
          target.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer }));
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
          handle.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
        `,
        handle,
        target,
      )
      await sleep(1000)
      return true
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
      return false
    }
  }, 30000)
}

async function findTaskCard(taskTitle) {
  const cards = await driver.findElements(cssTestId('task-card'))
  for (const card of cards) {
    try {
      if ((await card.getText()).includes(taskTitle)) return card
    } catch (error) {
      if (!String(error?.message || error).includes('stale element')) {
        throw error
      }
    }
  }
  return undefined
}

async function ensureTaskCardOpen(taskTitle) {
  const card = await findTaskCard(taskTitle)
  if (!card) return false

  const buttons = await card.findElements(cssTestId('button-task-accordion'))
  if (buttons.length === 0) return true
  const expanded = await buttons[0].getAttribute('aria-expanded')
  if (expanded === 'true') return true
  await buttons[0].click()
  await sleep(250)
  return true
}

async function clickBlockerRow(blockerText, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('blocker-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(blockerText)) {
          await row.click()
          return true
        }
      } catch (error) {
        if (!String(error?.message || error).includes('stale element')) {
          throw error
        }
      }
    }
    return false
  }, timeoutMs)
}

async function clickClientRow(clientName, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('client-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(clientName)) {
          await row.click()
          const detailPanels = await driver.findElements(cssTestId('client-detail-panel'))
          return detailPanels.length > 0
        }
      } catch (error) {
        if (!String(error?.message || error).includes('stale element')) {
          throw error
        }
      }
    }
    return false
  }, timeoutMs)
}

async function waitForNonEmptySelect(id, timeoutMs) {
  await driver.wait(async () => {
    const select = await driver.findElement(cssTestId(id))
    const options = await select.findElements(By.css('option'))
    return options.length > 1
  }, timeoutMs)
}

async function waitUntilNoButtonText(id, text, timeoutMs) {
  await driver.wait(async () => {
    const buttons = await driver.findElements(cssTestId(id))
    if (buttons.length === 0) return true
    return !(await buttons[0].getText()).includes(text)
  }, timeoutMs)
}

async function assertNoHorizontalOverflow() {
  const overflow = await driver.executeScript(`
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth;
  `)

  if (overflow > 2) {
    throw new Error(`Page has horizontal overflow of ${overflow}px.`)
  }
}

async function screenshot(name) {
  if (!driver) return undefined
  const file = path.join(screenshotDir, `${slug(name)}.png`)
  const data = await driver.takeScreenshot()
  fs.writeFileSync(file, data, 'base64')
  return path.relative(reportDir, file).replaceAll('\\', '/')
}

async function getVisibleText() {
  if (!driver) return ''
  try {
    const body = await driver.findElement(By.css('body'))
    return redact({ text: await body.getText() }).text
  } catch {
    return ''
  }
}

async function collectNetworkEvents() {
  if (!driver) return []
  try {
    const entries = await driver.manage().logs().get(logging.Type.PERFORMANCE)
    return entries
      .map(parsePerformanceEntry)
      .filter(Boolean)
      .filter((event) => isRelevantUrl(event.url))
      .map(redact)
  } catch (error) {
    return [{ type: 'network-log-error', error: serializeError(error) }]
  }
}

async function collectBrowserLogs() {
  if (!driver) return []
  try {
    const entries = await driver.manage().logs().get(logging.Type.BROWSER)
    return entries.map((entry) => redact({
      level: entry.level.name,
      message: entry.message,
      timestamp: entry.timestamp,
    }))
  } catch (error) {
    return [{ type: 'browser-log-error', error: serializeError(error) }]
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
  return (
    url &&
    (url.startsWith(config.frontendUrl) ||
      url.startsWith(config.backendUrl) ||
      url.includes('.supabase.co'))
  )
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
  const secretKeys = [
    'password',
    'authorization',
    'apikey',
    'apiKey',
    'access_token',
    'refresh_token',
    'token',
  ]

  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value

  const output = {}
  for (const [key, inner] of Object.entries(value)) {
    if (secretKeys.some((secret) => key.toLowerCase().includes(secret.toLowerCase()))) {
      output[key] = '[REDACTED]'
    } else {
      output[key] = redact(inner)
    }
  }

  return output
}

function serializeError(error) {
  return {
    name: error?.name,
    message: error?.message || String(error),
    stack: error?.stack,
  }
}

async function recordFatal(error) {
  report.summary.failed += 1
  report.steps.push({
    name: 'Fatal setup/runtime error',
    status: 'failed',
    error: serializeError(error),
    network: await collectNetworkEvents(),
    browserLogs: await collectBrowserLogs(),
  })
}

function writeReports() {
  report.finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(reportDir, 'events.json'), JSON.stringify(redact(events), null, 2))
  fs.writeFileSync(path.join(reportDir, 'report.html'), renderHtmlReport(report))
  console.log(`Selenium report written to ${reportDir}`)
}

function renderHtmlReport(data) {
  const rows = data.steps
    .map((step) => {
      const failedNetwork = (step.network || []).filter(
        (event) => event.type === 'response' && event.status >= 400,
      )
      return `
        <section class="step ${step.status}">
          <h2>${escapeHtml(step.name)} <span>${escapeHtml(step.status)}</span></h2>
          <p>Duration: ${step.durationMs ?? 0}ms</p>
          ${step.screenshot ? `<img src="${escapeHtml(step.screenshot)}" />` : ''}
          <h3>Payload</h3>
          <pre>${escapeHtml(JSON.stringify(step.payload ?? {}, null, 2))}</pre>
          <h3>Error</h3>
          <pre>${escapeHtml(JSON.stringify(step.error ?? null, null, 2))}</pre>
          <h3>Visible Page Text</h3>
          <pre>${escapeHtml(step.visibleText ?? '')}</pre>
          <h3>HTTP 4xx/5xx</h3>
          <pre>${escapeHtml(JSON.stringify(failedNetwork, null, 2))}</pre>
          <h3>Network Events</h3>
          <pre>${escapeHtml(JSON.stringify(step.network ?? [], null, 2))}</pre>
          <h3>Browser Logs</h3>
          <pre>${escapeHtml(JSON.stringify(step.browserLogs ?? [], null, 2))}</pre>
        </section>
      `
    })
    .join('\n')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Selenium E2E Report</title>
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
    <h1>Selenium E2E Report</h1>
    <p>Passed: ${data.summary.passed} | Failed: ${data.summary.failed}</p>
    <p>Started: ${escapeHtml(data.startedAt)} | Finished: ${escapeHtml(data.finishedAt ?? '')}</p>
  </section>
  ${rows}
</body>
</html>`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function loadDotEnv(file) {
  for (const [key, value] of Object.entries(readDotEnv(file))) {
    if (!process.env[key]) {
      process.env[key] = value
    }
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
