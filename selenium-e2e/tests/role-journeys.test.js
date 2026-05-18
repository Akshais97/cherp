const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { execFileSync, spawn } = require('node:child_process')
const { Builder, By, Capabilities, Key, logging, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const rootDir = path.resolve(__dirname, '..', '..')
const e2eDir = path.resolve(__dirname, '..')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const reportRoot = path.join(e2eDir, 'reports', `role-journeys-${runId}`)

loadDotEnv(path.join(e2eDir, '.env'))
const frontendEnv = readDotEnv(path.join(rootDir, 'frontend', '.env'))
const backendEnv = readDotEnv(path.join(rootDir, 'backend', '.env'))

const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5177',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3100',
  superAdminEmail: process.env.E2E_EMAIL,
  superAdminPassword: process.env.E2E_PASSWORD,
  rolePassword: process.env.E2E_ROLE_PASSWORD || process.env.E2E_PASSWORD,
  headless: process.env.HEADLESS !== 'false',
  startServers: process.env.START_SERVERS !== 'false',
}

const children = []
const events = []
const shared = {
  clientName: '',
  taskTitle: '',
  blockerTitle: '',
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => {
  stopServers()
  fs.mkdirSync(reportRoot, { recursive: true })
  fs.writeFileSync(path.join(reportRoot, 'events.json'), JSON.stringify(redact(events), null, 2))
  console.log(`Role journey reports written to ${reportRoot}`)
  process.exit(process.exitCode || 0)
})

async function main() {
  if (!config.superAdminEmail || !config.superAdminPassword) {
    throw new Error('E2E_EMAIL and E2E_PASSWORD are required.')
  }

  if (config.startServers) {
    await startServers()
  }

  const suffix = Date.now()
  const users = {
    super_admin: {
      label: 'Super Admin',
      email: config.superAdminEmail,
      password: config.superAdminPassword,
    },
    project_manager: {
      label: 'Project Manager',
      email: plusEmail(config.superAdminEmail, `pm-e2e-${suffix}`),
      password: config.rolePassword,
      fullName: `E2E Project Manager ${suffix}`,
      role: 'project_manager',
    },
    team_member: {
      label: 'Team Member',
      email: plusEmail(config.superAdminEmail, `team-e2e-${suffix}`),
      password: config.rolePassword,
      fullName: `E2E Team Member ${suffix}`,
      role: 'team_member',
    },
    client: {
      label: 'Client',
      email: plusEmail(config.superAdminEmail, `client-e2e-${suffix}`),
      password: config.rolePassword,
      fullName: `E2E Client ${suffix}`,
      role: 'client',
    },
  }

  await runJourney('super_admin', users.super_admin, async (ctx) => {
    await login(ctx, users.super_admin.email, users.super_admin.password)
    await step(ctx, 'Dashboard loads for Super Admin', async () => {
      await waitForTestId(ctx.driver, 'dashboard-page', 30000)
      await waitForTestId(ctx.driver, 'dashboard-metrics')
      await screenshot(ctx, 'dashboard')
    })
    await step(ctx, 'Create Project Manager, Team Member, and Client users', async () => {
      await clickByTestId(ctx.driver, 'nav-users')
      await waitForTestId(ctx.driver, 'users-page', 30000)
      for (const user of [users.project_manager, users.team_member, users.client]) {
        await createUser(ctx.driver, user)
        await waitForUserRow(ctx.driver, user.email, 45000)
      }
      await screenshot(ctx, 'created-role-users')
    })
    await step(ctx, 'Super Admin user management remains available', async () => {
      await assertElementPresent(ctx.driver, 'user-create-form')
      await assertElementPresent(ctx.driver, 'user-directory')
      await assertNoHorizontalOverflow(ctx.driver)
    })
    await logout(ctx)
  })

  await runJourney('project_manager', users.project_manager, async (ctx) => {
    await login(ctx, users.project_manager.email, users.project_manager.password)
    await step(ctx, 'Project Manager can view internal dashboard', async () => {
      await waitForTestId(ctx.driver, 'dashboard-page', 30000)
      await waitForTestId(ctx.driver, 'dashboard-client-health-panel')
      await assertElementAbsent(ctx.driver, 'nav-users')
      await screenshot(ctx, 'dashboard')
    })
    await step(ctx, 'Project Manager can onboard a client with a Month 1 workflow', async () => {
      await clickByTestId(ctx.driver, 'nav-clients')
      await waitForTestId(ctx.driver, 'clients-page', 30000)
      await seedTemplatesIfAvailable(ctx.driver)
      await waitForNonEmptySelect(ctx.driver, 'select-scope-template', 45000)
      shared.clientName = `PM Role Client ${Date.now()}`
      await createClient(ctx.driver, shared.clientName)
      await waitForClientRow(ctx.driver, shared.clientName, 45000)
      await screenshot(ctx, 'client-onboarded')
    })
    await step(ctx, 'Project Manager can create a task and blocker', async () => {
      await clickByTestId(ctx.driver, 'nav-workflows')
      await waitForTestId(ctx.driver, 'workflows-page', 30000)
      await typeByTestId(ctx.driver, 'input-workflow-search', shared.clientName)
      await clickWorkflowRow(ctx.driver, shared.clientName, 45000)
      await waitForTestId(ctx.driver, 'workflow-detail-panel', 30000)
      shared.taskTitle = `PM Role Task ${Date.now()}`
      shared.blockerTitle = `PM Role Blocker ${Date.now()}`
      await typeByTestId(ctx.driver, 'input-task-title', shared.taskTitle)
      await setValueByTestId(ctx.driver, 'input-task-due-date', today())
      await clickByTestId(ctx.driver, 'button-create-task')
      await waitForTaskCardText(ctx.driver, shared.taskTitle, 'Pending', 30000)
      await selectTaskCardOption(
        ctx.driver,
        shared.taskTitle,
        'select-task-card-assignee',
        users.team_member.fullName,
      )
      await selectTaskCardOption(ctx.driver, shared.taskTitle, 'select-task-status', 'In progress')
      await typeTaskCardField(ctx.driver, shared.taskTitle, 'input-blocker-title', shared.blockerTitle)
      await typeTaskCardField(ctx.driver, shared.taskTitle, 'textarea-blocker-description', 'PM role E2E blocker')
      await typeTaskCardField(ctx.driver, shared.taskTitle, 'input-blocker-impact', 'Role journey validation')
      await clickTaskCardButton(ctx.driver, shared.taskTitle, 'button-create-blocker')
      await waitForTaskCardText(ctx.driver, shared.taskTitle, 'Blocked', 30000)
      await sleep(1500)
      await screenshot(ctx, 'task-blocked')
    })
    await step(ctx, 'Project Manager can resolve blocker', async () => {
      await clickByTestId(ctx.driver, 'nav-blockers')
      await waitForTestId(ctx.driver, 'blockers-page', 30000)
      await clickBlockerRow(ctx.driver, shared.blockerTitle, 45000)
      await waitForTestId(ctx.driver, 'blocker-detail-panel', 30000)
      await typeByTestId(ctx.driver, 'textarea-resolution-notes', 'Resolved by PM role journey')
      await clickByTestId(ctx.driver, 'button-resolve-blocker')
      await waitForText(ctx.driver, 'Resolved by PM role journey', 30000)
      await screenshot(ctx, 'blocker-resolved')
    })
    await logout(ctx)
  })

  await runJourney('team_member', users.team_member, async (ctx) => {
    await login(ctx, users.team_member.email, users.team_member.password)
    await step(ctx, 'Team Member can view internal dashboard without admin nav', async () => {
      await waitForTestId(ctx.driver, 'dashboard-page', 30000)
      await waitForTestId(ctx.driver, 'dashboard-metrics')
      await assertElementAbsent(ctx.driver, 'nav-users')
      await screenshot(ctx, 'dashboard')
    })
    await step(ctx, 'Team Member sees client details as read-only', async () => {
      await clickByTestId(ctx.driver, 'nav-clients')
      await waitForTestId(ctx.driver, 'clients-page', 30000)
      await assertElementAbsent(ctx.driver, 'client-onboarding-form')
      await typeByTestId(ctx.driver, 'input-client-search', shared.clientName)
      await clickClientRow(ctx.driver, shared.clientName, 45000)
      await waitForTestId(ctx.driver, 'client-readonly-detail', 30000)
      await assertElementAbsent(ctx.driver, 'client-edit-form')
      await screenshot(ctx, 'client-readonly')
    })
    await step(ctx, 'Team Member can update task execution state', async () => {
      await clickByTestId(ctx.driver, 'nav-workflows')
      await waitForTestId(ctx.driver, 'workflows-page', 30000)
      await typeByTestId(ctx.driver, 'input-workflow-search', shared.clientName)
      await clickWorkflowRow(ctx.driver, shared.clientName, 45000)
      await waitForTaskCardText(ctx.driver, shared.taskTitle, 'In progress', 30000)
      await assertElementAbsent(ctx.driver, 'task-create-form')
      await clickTaskCardButton(ctx.driver, shared.taskTitle, 'button-complete-task')
      await waitForTaskCardText(ctx.driver, shared.taskTitle, 'Completed', 30000)
      await screenshot(ctx, 'task-completed')
    })
    await logout(ctx)
  })

  await runJourney('client', users.client, async (ctx) => {
    await login(ctx, users.client.email, users.client.password)
    await step(ctx, 'Client role signs in but internal dashboard APIs are forbidden', async () => {
      await waitForTestId(ctx.driver, 'app-shell', 30000)
      await waitForText(ctx.driver, 'User role is not allowed for this route.', 45000)
      await assertElementAbsent(ctx.driver, 'nav-users')
      await screenshot(ctx, 'forbidden-dashboard')
    })
    await step(ctx, 'Client role cannot access internal workflow data', async () => {
      await clickByTestId(ctx.driver, 'nav-workflows')
      await waitForTestId(ctx.driver, 'workflows-page', 30000)
      await waitForText(ctx.driver, 'User role is not allowed for this route.', 45000)
      await screenshot(ctx, 'forbidden-workflows')
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
        // Browser may already be closed.
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
        email: roleKey === 'super_admin' ? config.superAdminEmail : undefined,
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
    item.network = await collectNetworkEvents(ctx.driver)
    item.browserLogs = await collectBrowserLogs(ctx.driver)
    item.screenshot = await screenshot(ctx, `failure-${slug(name)}`)
    ctx.report.summary.failed += 1
    throw error
  } finally {
    item.durationMs = Date.now() - startedAt
  }
}

async function login(ctx, email, password) {
  await step(ctx, 'Sign in', async () => {
    await ctx.driver.get(config.frontendUrl)
    await waitForTestId(ctx.driver, 'login-page', 30000)
    await typeByTestId(ctx.driver, 'input-email', email)
    await typeByTestId(ctx.driver, 'input-password', password)
    await clickByTestId(ctx.driver, 'button-sign-in')
    await waitForTestId(ctx.driver, 'app-shell', 45000)
    await assertNoHorizontalOverflow(ctx.driver)
    await screenshot(ctx, 'signed-in')
  })
}

async function logout(ctx) {
  await step(ctx, 'Logout returns to login page', async () => {
    await clickByTestId(ctx.driver, 'button-logout')
    await waitForTestId(ctx.driver, 'login-page', 30000)
    await screenshot(ctx, 'logout')
  })
}

async function createUser(driver, user) {
  await typeByTestId(driver, 'input-user-email', user.email)
  await typeByTestId(driver, 'input-user-full-name', user.fullName)
  await selectByValue(driver, 'select-user-role', user.role)
  await typeByTestId(driver, 'input-user-password', user.password)
  await clickByTestId(driver, 'button-create-user')
  await waitUntilNoButtonText(driver, 'button-create-user', 'Creating...', 45000)
}

async function createClient(driver, clientName) {
  const select = await waitForTestId(driver, 'select-scope-template')
  const options = await select.findElements(By.css('option'))
  if (options.length < 2) throw new Error('No selectable scope templates were available.')
  await options[1].click()
  await waitForTestId(driver, 'template-preview-card', 30000)
  await typeByTestId(driver, 'input-client-name', clientName)
  await typeByTestId(driver, 'input-client-contact-email', `role.${Date.now()}@example.com`)
  await typeByTestId(driver, 'input-client-contact-name', 'Role Journey Tester')
  await typeByTestId(driver, 'input-client-retainer', '5000')
  await typeByTestId(driver, 'input-client-currency', 'INR')
  await setValueByTestId(driver, 'input-client-contract-start', today())
  await typeByTestId(driver, 'input-client-payment-terms', 'Net 15')
  await setValueByTestId(driver, 'input-client-renewal-date', datePlusDays(90))
  await clickByTestId(driver, 'button-create-client')
}

async function buildDriver() {
  const options = new chrome.Options()
  options.addArguments('--window-size=1440,1000')
  options.addArguments('--disable-dev-shm-usage')
  options.addArguments('--no-sandbox')
  if (config.headless) options.addArguments('--headless=new')

  const capabilities = Capabilities.chrome()
  capabilities.set('goog:loggingPrefs', { browser: 'ALL', performance: 'ALL' })

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
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(new URL(config.frontendUrl).port), '--strictPort'],
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
  const child = spawn(command, args, {
    cwd,
    env: buildChildEnv(name),
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout.on('data', (chunk) => events.push({ source: name, stream: 'stdout', message: chunk.toString() }))
  child.stderr.on('data', (chunk) => events.push({ source: name, stream: 'stderr', message: chunk.toString() }))
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
    req.setTimeout(3000, () => req.destroy(new Error('Request timed out')))
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
  await driver.wait(until.elementIsEnabled(element), 15000)
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center", inline: "center" });', element)
  try {
    await element.click()
  } catch (error) {
    if (!String(error?.message || error).includes('element click intercepted')) throw error
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
    'arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event("input", { bubbles: true })); arguments[0].dispatchEvent(new Event("change", { bubbles: true }));',
    element,
    value,
  )
}

async function selectByValue(driver, id, value) {
  const select = await waitForTestId(driver, id)
  await driver.executeScript('arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event("change", { bubbles: true }));', select, value)
}

async function waitForText(driver, text, timeoutMs) {
  await driver.wait(async () => (await driver.getPageSource()).includes(text), timeoutMs)
}

async function waitForNonEmptySelect(driver, id, timeoutMs) {
  await driver.wait(async () => {
    const select = await driver.findElement(cssTestId(id))
    const options = await select.findElements(By.css('option'))
    return options.length > 1
  }, timeoutMs)
}

async function waitUntilNoButtonText(driver, id, text, timeoutMs) {
  await driver.wait(async () => {
    const buttons = await driver.findElements(cssTestId(id))
    if (buttons.length === 0) return true
    return !(await buttons[0].getText()).includes(text)
  }, timeoutMs)
}

async function assertElementPresent(driver, id) {
  const elements = await driver.findElements(cssTestId(id))
  if (elements.length === 0) throw new Error(`${id} was not present.`)
}

async function assertElementAbsent(driver, id) {
  const elements = await driver.findElements(cssTestId(id))
  if (elements.length > 0) throw new Error(`${id} should not be present.`)
}

async function waitForUserRow(driver, email, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('user-row'))
    for (const row of rows) {
      if ((await row.getText()).includes(email)) return true
    }
    return false
  }, timeoutMs)
}

async function waitForClientRow(driver, clientName, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('client-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(clientName)) return true
      } catch (error) {
        if (!String(error?.message || error).includes('stale element')) throw error
      }
    }
    return false
  }, timeoutMs)
}

async function clickClientRow(driver, clientName, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('client-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(clientName)) {
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

async function clickBlockerRow(driver, blockerText, timeoutMs) {
  await driver.wait(async () => {
    const rows = await driver.findElements(cssTestId('blocker-row'))
    for (const row of rows) {
      try {
        if ((await row.getText()).includes(blockerText)) {
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
    const card = await findTaskCard(driver, taskTitle)
    if (!card) return false
    const select = await card.findElement(cssTestId(testId))
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

async function typeTaskCardField(driver, taskTitle, testId, value) {
  await driver.wait(async () => {
    await ensureTaskCardOpen(driver, taskTitle)
    const card = await findTaskCard(driver, taskTitle)
    if (!card) return false
    const element = await card.findElement(cssTestId(testId))
    await element.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE)
    if (value) await element.sendKeys(value)
    return true
  }, 30000)
}

async function clickTaskCardButton(driver, taskTitle, testId) {
  await driver.wait(async () => {
    await ensureTaskCardOpen(driver, taskTitle)
    const card = await findTaskCard(driver, taskTitle)
    if (!card) return false
    const button = await card.findElement(cssTestId(testId))
    if (!(await button.isEnabled())) return false
    await button.click()
    return true
  }, 30000)
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
  const card = await findTaskCard(driver, taskTitle)
  if (!card) return false
  const buttons = await card.findElements(cssTestId('button-task-accordion'))
  if (buttons.length === 0) return true
  const expanded = await buttons[0].getAttribute('aria-expanded')
  if (expanded === 'true') return true
  await buttons[0].click()
  await sleep(250)
  return true
}

async function seedTemplatesIfAvailable(driver) {
  const buttons = await driver.findElements(cssTestId('button-seed-templates'))
  if (buttons.length === 0) return
  await buttons[0].click()
  await waitUntilNoButtonText(driver, 'button-seed-templates', 'Seeding...', 45000)
}

async function assertNoHorizontalOverflow(driver) {
  const overflow = await driver.executeScript('return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;')
  if (overflow > 2) throw new Error(`Page has horizontal overflow of ${overflow}px.`)
}

async function screenshot(ctx, name) {
  if (!ctx.driver) return undefined
  const file = path.join(ctx.screenshotDir, `${slug(name)}.png`)
  const data = await ctx.driver.takeScreenshot()
  fs.writeFileSync(file, data, 'base64')
  return path.relative(ctx.dir, file).replaceAll('\\', '/')
}

async function getVisibleText(driver) {
  try {
    const body = await driver.findElement(By.css('body'))
    return redact({ text: await body.getText() }).text
  } catch {
    return ''
  }
}

async function collectNetworkEvents(driver) {
  try {
    const entries = await driver.manage().logs().get(logging.Type.PERFORMANCE)
    return entries.map(parsePerformanceEntry).filter(Boolean).filter((event) => isRelevantUrl(event.url)).map(redact)
  } catch (error) {
    return [{ type: 'network-log-error', error: serializeError(error) }]
  }
}

async function collectBrowserLogs(driver) {
  try {
    const entries = await driver.manage().logs().get(logging.Type.BROWSER)
    return entries.map((entry) => redact({ level: entry.level.name, message: entry.message, timestamp: entry.timestamp }))
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
  <title>${escapeHtml(data.role)} Role Journey Report</title>
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
    <h1>${escapeHtml(data.role)} Role Journey Report</h1>
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

function plusEmail(email, tag) {
  const [local, domain] = email.split('@')
  if (!local || !domain) throw new Error('E2E_EMAIL must be a valid email address.')
  return `${local}+${tag}@${domain}`
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
